// Domain utility functions

const BLOCKED_DOMAINS = new Set([
  "amazon.com",
  "etsy.com",
  "wayfair.com",
  "walmart.com",
  "target.com",
  "overstock.com",
  "homedepot.com",
  "lowes.com",
  "ebay.com",
  "craigslist.org",
  "facebook.com",
  "instagram.com",
  "yelp.com",
  "google.com",
  "bing.com",
  "yellowpages.com",
]);

export function extractDomain(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedDomain(domain: string | null | undefined): boolean {
  if (!domain) return true;
  return BLOCKED_DOMAINS.has(domain);
}

export function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}
