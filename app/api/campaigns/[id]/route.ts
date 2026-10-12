import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          include: {
            contact: {
              include: { lead: true },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Compute stats
    const stats = {
      total: campaign.messages.length,
      queued: campaign.messages.filter((m: { status: string }) => m.status === "queued").length,
      sent: campaign.messages.filter((m: { status: string }) => m.status === "sent").length,
      delivered: campaign.messages.filter((m: { status: string }) => m.status === "delivered").length,
      bounced: campaign.messages.filter((m: { status: string }) => m.status === "bounced").length,
      failed: campaign.messages.filter((m: { status: string }) => m.status === "failed").length,
    };

    return NextResponse.json({ campaign, stats });
  } catch (err) {
    console.error("[api/campaigns/[id]] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
