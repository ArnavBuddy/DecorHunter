import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Resend } from "resend";
import { createUnsubscribeToken } from "../../../../../lib/email/token";
import {
  renderEmailBody,
  buildHtmlEmail,
  buildPlainText,
} from "../../../../../lib/email/template";
import { sleep } from "../../../../../lib/adapters/retry";

const DRY_RUN = process.env.DRY_RUN !== "false";
const DRY_RUN_EMAIL = process.env.DRY_RUN_EMAIL ?? "test@example.com";
const SEND_DELAY_MS = parseInt(process.env.SEND_DELAY_MS ?? "3000", 10);
const DAILY_SEND_CAP = parseInt(process.env.DAILY_SEND_CAP ?? "50", 10);
const PHYSICAL_ADDRESS =
  process.env.PHYSICAL_ADDRESS ?? "123 Main St, New York NY 10001";

const resend = process.env.RESEND_KEY ? new Resend(process.env.RESEND_KEY) : null;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          where: { status: "queued" },
          include: { contact: { include: { lead: true } } },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Count today's sends
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await prisma.message.count({
      where: { status: "sent", sent_at: { gte: startOfDay } },
    });

    if (sentToday >= DAILY_SEND_CAP) {
      return NextResponse.json(
        { error: `Daily send cap of ${DAILY_SEND_CAP} reached. Try again tomorrow.` },
        { status: 429 }
      );
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending" },
    });

    // Get fresh suppression list
    const suppressed = await prisma.suppressionList.findMany({
      select: { email: true },
    });
    const suppressedEmails = new Set(suppressed.map((s: { email: string }) => s.email));

    let sent = 0;
    const remaining = DAILY_SEND_CAP - sentToday;

    for (const message of campaign.messages.slice(0, remaining)) {
      const contact = message.contact;
      if (suppressedEmails.has(contact.email)) {
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "failed" },
        });
        continue;
      }

      const unsubToken = createUnsubscribeToken(contact.email);
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const unsubscribeLink = `${baseUrl}/unsubscribe/${unsubToken}`;

      const firstName = contact.name?.split(" ")[0];
      const bodyRendered = renderEmailBody(campaign.body_template, {
        company: contact.lead?.company_name,
        first_name: firstName,
        unsubscribe_link: unsubscribeLink,
        physical_address: PHYSICAL_ADDRESS,
      });

      const htmlBody = buildHtmlEmail({
        subject: campaign.subject,
        bodyHtml: bodyRendered,
        fromName: campaign.from_name,
        unsubscribeLink,
        physicalAddress: PHYSICAL_ADDRESS,
      });

      const plainBody = buildPlainText({
        bodyText: bodyRendered,
        fromName: campaign.from_name,
        unsubscribeLink,
        physicalAddress: PHYSICAL_ADDRESS,
      });

      const toEmail = DRY_RUN ? DRY_RUN_EMAIL : contact.email;
      const subject = DRY_RUN
        ? `[DRY RUN] ${campaign.subject}`
        : campaign.subject;

      try {
        let providerId: string | undefined;

        if (resend) {
          const result = await resend.emails.send({
            from: `${campaign.from_name} <${campaign.from_email}>`,
            to: [toEmail],
            subject,
            html: htmlBody,
            text: plainBody,
          });
          providerId = result.data?.id;
        } else {
          // No Resend key — log only
          console.log(
            `[send] Would send to ${toEmail} — subject: "${subject}"`
          );
          providerId = `mock-${Date.now()}`;
        }

        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "sent",
            provider_message_id: providerId,
            sent_at: new Date(),
          },
        });
        sent++;
      } catch (err) {
        console.error(`[send] Failed to send to ${contact.email}:`, err);
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "failed" },
        });
      }

      // Throttle
      if (sent < campaign.messages.length) {
        await sleep(SEND_DELAY_MS);
      }
    }

    const allDone = await prisma.message.count({
      where: { campaign_id: campaign.id, status: "queued" },
    });

    if (allDone === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "done" },
      });
    }

    return NextResponse.json({ sent, dryRun: DRY_RUN });
  } catch (err) {
    console.error("[api/campaigns/[id]/send] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
