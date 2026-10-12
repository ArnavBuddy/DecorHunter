// Hunter.io adapter — Domain Search + Email Verifier
// Docs: https://hunter.io/api-documentation

import type { LeadSource, RawLead, RawContact, SearchParams } from "./types";
import { withRetry } from "./retry";

const HUNTER_BASE = "https://api.hunter.io/v2";

// Preferred roles for enrichment (buyers, decision makers)
const PRIORITY_ROLES = [
  "buyer",
  "purchasing",
  "merchandising",
  "owner",
  "founder",
  "president",
  "director",
  "procurement",
  "wholesale",
  "retail",
];

interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  linkedin?: string;
}

interface HunterDomainResponse {
  data: {
    emails: HunterEmail[];
    organization?: string;
    domain?: string;
  };
}

interface HunterVerifyResponse {
  data: {
    result: "deliverable" | "risky" | "undeliverable" | "unknown";
    score: number;
    email: string;
  };
}

export class HunterAdapter implements LeadSource {
  name = "hunter";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // LeadSource.search is not the primary use of Hunter — it mainly enriches domains
  // We implement it as a no-op here; enrichment is done via enrichDomain
  async search(_params: SearchParams): Promise<RawLead[]> {
    return [];
  }

  async enrichDomain(domain: string): Promise<RawContact[]> {
    try {
      const data = await withRetry(() => this.fetchDomainSearch(domain));
      const emails = data.data?.emails ?? [];

      // Sort: prioritize high-confidence emails with relevant roles
      const sorted = emails.sort((a, b) => {
        const aScore = this.roleScore(a.position) + a.confidence;
        const bScore = this.roleScore(b.position) + b.confidence;
        return bScore - aScore;
      });

      return sorted.map((e) => ({
        name: [e.first_name, e.last_name].filter(Boolean).join(" ") || undefined,
        title: e.position,
        email: e.value,
        confidence: e.confidence,
        source: this.name,
      }));
    } catch (err) {
      console.error(`[hunter] enrichDomain failed for ${domain}:`, err);
      return [];
    }
  }

  async verifyEmail(
    email: string
  ): Promise<"valid" | "risky" | "invalid" | "unknown"> {
    try {
      const data = await withRetry(() => this.fetchVerify(email));
      const result = data.data?.result;
      if (result === "deliverable") return "valid";
      if (result === "risky") return "risky";
      if (result === "undeliverable") return "invalid";
      return "unknown";
    } catch (err) {
      console.error(`[hunter] verifyEmail failed for ${email}:`, err);
      return "unknown";
    }
  }

  private roleScore(position?: string): number {
    if (!position) return 0;
    const lc = position.toLowerCase();
    for (let i = 0; i < PRIORITY_ROLES.length; i++) {
      if (lc.includes(PRIORITY_ROLES[i])) return PRIORITY_ROLES.length - i;
    }
    return 0;
  }

  private async fetchDomainSearch(domain: string): Promise<HunterDomainResponse> {
    const url = `${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Hunter domain-search error ${res.status}: ${body}`);
    }
    return res.json();
  }

  private async fetchVerify(email: string): Promise<HunterVerifyResponse> {
    const url = `${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Hunter verifier error ${res.status}: ${body}`);
    }
    return res.json();
  }
}

// Mock adapter
export class MockHunterAdapter {
  name = "hunter_mock";

  async enrichDomain(domain: string): Promise<RawContact[]> {
    return [
      {
        name: "Jane Smith",
        title: "Buyer",
        email: `buyer@${domain}`,
        confidence: 85,
        source: this.name,
      },
      {
        name: "Tom Johnson",
        title: "Owner",
        email: `hello@${domain}`,
        confidence: 72,
        source: this.name,
      },
    ];
  }

  async verifyEmail(
    _email: string
  ): Promise<"valid" | "risky" | "invalid" | "unknown"> {
    return "valid";
  }
}
