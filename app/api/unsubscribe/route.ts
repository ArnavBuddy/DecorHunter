import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verifyUnsubscribeToken } from "../../../lib/email/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const email = verifyUnsubscribeToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  try {
    await prisma.suppressionList.upsert({
      where: { email },
      update: {},
      create: { email, reason: "unsubscribed" },
    });

    // Redirect to confirmation page
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${base}/unsubscribe/success`);
  } catch (err) {
    console.error("[api/unsubscribe] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
