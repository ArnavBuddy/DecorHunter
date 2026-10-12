import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import {
  GooglePlacesAdapter,
  MockGooglePlacesAdapter,
} from "../../../lib/adapters/google-places";
import { HunterAdapter, MockHunterAdapter } from "../../../lib/adapters/hunter";
import { extractDomain, isBlockedDomain } from "../../../lib/adapters/domain-utils";
import type { RawLead } from "../../../lib/adapters/types";

const SearchSchema = z.object({
  keywords: z.string().min(1),
  cities: z.array(z.string()).default([]),
  states: z.array(z.string()).default([]),
});

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;
const HUNTER_KEY = process.env.HUNTER_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = SearchSchema.parse(body);

    // Pick adapters based on available keys
    const placesAdapter = GOOGLE_KEY
      ? new GooglePlacesAdapter(GOOGLE_KEY)
      : new MockGooglePlacesAdapter();

    const hunterAdapter = HUNTER_KEY
      ? new HunterAdapter(HUNTER_KEY)
      : new MockHunterAdapter();

    // Fan out to all search sources in parallel
    const [placesResults] = await Promise.allSettled([
      placesAdapter.search(params),
    ]);

    const rawLeads: RawLead[] = [];
    if (placesResults.status === "fulfilled") {
      rawLeads.push(...placesResults.value);
    }

    // Dedupe by domain then by company name
    const seen = new Set<string>();
    const deduped: RawLead[] = [];
    for (const lead of rawLeads) {
      const key = lead.domain ?? lead.company_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (isBlockedDomain(lead.domain)) continue;
      deduped.push(lead);
    }

    // Upsert leads to DB and enrich with Hunter
    const savedLeads = await Promise.all(
      deduped.map(async (raw) => {
        const lead = await prisma.lead.upsert({
          where: { domain: raw.domain ?? `no-domain-${raw.company_name}` },
          update: {},
          create: {
            company_name: raw.company_name,
            website: raw.website,
            domain: raw.domain,
            city: raw.city,
            state: raw.state,
            country: "US",
            source: raw.source,
            category: raw.category,
          },
          include: { contacts: true },
        });

        // Enrich with Hunter if domain is available and no contacts yet
        if (raw.domain && lead.contacts.length === 0) {
          try {
            const contacts = await hunterAdapter.enrichDomain(raw.domain);
            if (contacts.length > 0) {
              await prisma.contact.createMany({
                data: contacts.map((c) => ({
                  lead_id: lead.id,
                  name: c.name,
                  title: c.title,
                  email: c.email,
                  confidence: c.confidence,
                  source: c.source,
                  email_status: "unverified",
                })),
              });
            }
          } catch (err) {
            console.error(`[search] Hunter enrich failed for ${raw.domain}:`, err);
          }
        }

        return prisma.lead.findUnique({
          where: { id: lead.id },
          include: { contacts: true },
        });
      })
    );

    const dryRun = process.env.DRY_RUN !== "false";
    return NextResponse.json({
      leads: savedLeads.filter(Boolean),
      dryRun,
      mockMode: !GOOGLE_KEY || !HUNTER_KEY,
    });
  } catch (err) {
    console.error("[api/search] error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
