// Google Places Text Search adapter
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

import type { LeadSource, RawLead, SearchParams } from "./types";
import { withRetry } from "./retry";
import { extractDomain, isBlockedDomain } from "./domain-utils";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface PlaceResult {
  displayName?: { text?: string };
  websiteUri?: string;
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
}

interface PlacesResponse {
  places?: PlaceResult[];
}

function parseStateCity(
  address: string
): { city?: string; state?: string } {
  // addresses often look like "123 Main, Austin, TX 78701, USA"
  const parts = address.split(",").map((p) => p.trim());
  const usIdx = parts.findIndex((p) => p === "USA" || p === "United States");
  if (usIdx >= 2) {
    const stateZip = parts[usIdx - 1];
    const stateMatch = stateZip.match(/^([A-Z]{2})/);
    return {
      city: parts[usIdx - 2],
      state: stateMatch ? stateMatch[1] : undefined,
    };
  }
  return {};
}

export class GooglePlacesAdapter implements LeadSource {
  name = "google_places";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(params: SearchParams): Promise<RawLead[]> {
    const { keywords, cities, states } = params;
    const leads: RawLead[] = [];
    const seen = new Set<string>();

    const locations =
      cities.length > 0
        ? cities.map((c, i) => `${c}, ${states[i] ?? states[0] ?? "US"}`)
        : states.map((s) => s);

    for (const location of locations) {
      const query = `${keywords} in ${location}`;
      try {
        const results = await withRetry(() => this.fetchPlaces(query));
        for (const place of results) {
          const name = place.displayName?.text;
          if (!name) continue;

          const website = place.websiteUri;
          const domain = extractDomain(website);
          if (isBlockedDomain(domain)) continue;
          const key = domain ?? name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          const { city, state } = parseStateCity(
            place.formattedAddress ?? ""
          );

          leads.push({
            company_name: name,
            website,
            domain: domain ?? undefined,
            city,
            state,
            source: this.name,
            category:
              place.primaryTypeDisplayName?.text ?? "home decor",
          });
        }
      } catch (err) {
        console.error(`[google-places] Failed for "${query}":`, err);
      }
    }

    return leads;
  }

  private async fetchPlaces(query: string): Promise<PlaceResult[]> {
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.websiteUri,places.formattedAddress,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        maxResultCount: 20,
        regionCode: "US",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Places API error ${res.status}: ${body}`);
    }

    const data: PlacesResponse = await res.json();
    return data.places ?? [];
  }
}

// Mock adapter for when no API key is set
export class MockGooglePlacesAdapter implements LeadSource {
  name = "google_places_mock";

  async search(params: SearchParams): Promise<RawLead[]> {
    const city = params.cities[0] ?? "Austin";
    const state = params.states[0] ?? "TX";
    return [
      {
        company_name: `${city} Home Decor Boutique`,
        website: `https://www.${city.toLowerCase().replace(/\s/g, "")}homedecor.com`,
        domain: `${city.toLowerCase().replace(/\s/g, "")}homedecor.com`,
        city,
        state,
        source: this.name,
        category: "home decor store",
      },
      {
        company_name: `${city} Interior Design Studio`,
        website: `https://www.${city.toLowerCase().replace(/\s/g, "")}interiors.com`,
        domain: `${city.toLowerCase().replace(/\s/g, "")}interiors.com`,
        city,
        state,
        source: this.name,
        category: "interior design",
      },
      {
        company_name: "Coastal Living Furnishings",
        website: "https://www.coastallivingfurnishings.com",
        domain: "coastallivingfurnishings.com",
        city: "Santa Monica",
        state: "CA",
        source: this.name,
        category: "furniture boutique",
      },
    ];
  }
}
