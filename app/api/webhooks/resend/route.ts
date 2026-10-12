import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Resend webhook handler
// Events: email.bounced, email.complained, email.opened, email.delivered
export async function POST(req: NextRequest) {
  try {
    // Basic signing header check — set RESEND_WEBHOOK_SECRET in env for production
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers.get("svix-signature") ?? req.headers.get("resend-signature");
      if (!signature || !signature.includes(webhookSecret.slice(0, 8))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const event = await req.json();
    const type: string = event.type ?? "";
    const emailId: string = event.data?.email_id ?? "";
    const toEmail: string | undefined = event.data?.to?.[0];

    console.log(`[webhook/resend] event: ${type}, email_id: ${emailId}`);

    switch (type) {
      case "email.delivered":
        await prisma.message.updateMany({
          where: { provider_message_id: emailId },
          data: { status: "delivered" },
        });
        break;

      case "email.bounced":
        await prisma.message.updateMany({
          where: { provider_message_id: emailId },
          data: { status: "bounced" },
        });
        if (toEmail) {
          await prisma.suppressionList.upsert({
            where: { email: toEmail },
            update: {},
            create: { email: toEmail, reason: "bounced" },
          });
        }
        break;

      case "email.complained":
        if (toEmail) {
          await prisma.suppressionList.upsert({
            where: { email: toEmail },
            update: {},
            create: { email: toEmail, reason: "complaint" },
          });
        }
        break;

      default:
        // Ignore other event types (opens, clicks)
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/resend] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
