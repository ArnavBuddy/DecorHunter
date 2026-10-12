import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { HunterAdapter, MockHunterAdapter } from "../../../../lib/adapters/hunter";

const HUNTER_KEY = process.env.HUNTER_KEY;

const VerifySchema = z.object({
  contactIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactIds } = VerifySchema.parse(body);

    const hunter = HUNTER_KEY
      ? new HunterAdapter(HUNTER_KEY)
      : new MockHunterAdapter();

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    });

    const results = await Promise.all(
      contacts.map(async (contact: { id: string; email: string }) => {
        const status = await hunter.verifyEmail(contact.email);
        const emailStatus =
          status === "valid"
            ? "valid"
            : status === "risky"
            ? "risky"
            : status === "invalid"
            ? "invalid"
            : "unverified";

        return prisma.contact.update({
          where: { id: contact.id },
          data: { email_status: emailStatus },
        });
      })
    );

    return NextResponse.json({ updated: results });
  } catch (err) {
    console.error("[api/leads/verify] error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
