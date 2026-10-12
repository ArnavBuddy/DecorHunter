import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

const CampaignSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body_template: z.string().min(1),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  contact_ids: z.array(z.string()),
});

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CampaignSchema.parse(body);

    // Fetch suppression list to filter contacts
    const suppressed = await prisma.suppressionList.findMany({
      select: { email: true },
    });
    const suppressedEmails = new Set(suppressed.map((s: { email: string }) => s.email));

    // Filter contacts to only valid emails not on suppression list
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: data.contact_ids },
        email_status: { in: ["valid", "unverified"] },
      },
    });

    const eligible = contacts.filter((c: { email: string }) => !suppressedEmails.has(c.email));

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        body_template: data.body_template,
        from_name: data.from_name,
        from_email: data.from_email,
        status: "draft",
        messages: {
          create: eligible.map((c: { id: string }) => ({
            contact_id: c.id,
            status: "queued",
          })),
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("[api/campaigns] POST error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
