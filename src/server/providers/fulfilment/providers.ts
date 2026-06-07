/**
 * Concierge-prep provider config (Fase 3). We can't pre-fill a third party's
 * checkout without their API, so for each category we deep-link to the best
 * starting point and hand the user a ready-to-enter checklist. No autonomous
 * booking/payment — the user finishes on the external site.
 */

/** Reliable deep link that lands on a specific site's results. */
function siteSearch(query: string, site: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} site:${site}`)}`;
}

export interface ConciergeAddress {
  name?: string | null;
  line?: string | null;
  postal?: string | null;
  city?: string | null;
}

export function formatAddress(a: ConciergeAddress | undefined | null): string | null {
  if (!a) return null;
  const parts = [a.line, [a.postal, a.city].filter(Boolean).join(" ")].filter(Boolean);
  const body = parts.join(", ");
  if (!body) return null;
  return a.name ? `${a.name} — ${body}` : body;
}

/** Flowers → Topbloemen. Deep-links to the flower type on topbloemen.nl. */
export function flowerProvider(flowerType: string) {
  const q = flowerType || "bloemen";
  return {
    name: "Topbloemen",
    url: siteSearch(q, "topbloemen.nl"),
  };
}

/** Restaurant → the restaurant's own reservation page (via a scoped search). */
export function restaurantProvider(place: string, city?: string | null) {
  return {
    name: place || "het restaurant",
    url: `https://www.google.com/search?q=${encodeURIComponent(
      `${place}${city ? " " + city : ""} reserveren`,
    )}`,
  };
}

/** Gift → a general shopping starting point. */
export function giftProvider(item: string) {
  return {
    name: "winkel",
    url: `https://www.google.com/search?q=${encodeURIComponent(`${item} kopen bezorgen`)}`,
  };
}
