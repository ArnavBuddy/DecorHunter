import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { created_at: "desc" },
      include: { contacts: true },
      take: 200,
    });
    return NextResponse.json({ leads });
  } catch (err) {
    console.error("[api/leads] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
