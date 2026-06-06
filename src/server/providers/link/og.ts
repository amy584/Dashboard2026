import type { LinkMetadata, LinkParser } from "./types";

/**
 * Generic Open Graph parser. Fetches the public HTML and reads <meta og:*>
 * tags only — no auth, no scraping of protected content (§8). Instagram URLs
 * are recognised for the `platform` tag but parsed via the same public-metadata
 * path; if Instagram returns thin/blocked metadata the user fills fields in
 * manually (handled by the UI).
 */
export class OpenGraphLinkParser implements LinkParser {
  supports(): boolean {
    return true; // generic fallback handles any URL
  }

  async fetchMetadata(url: string): Promise<LinkMetadata> {
    const platform = /instagram\.com/i.test(url)
      ? "instagram"
      : ("other" as LinkMetadata["platform"]);

    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AttenttBot/1.0 (+https://attentt.app)" },
        redirect: "follow",
      });
      if (res.ok) html = await res.text();
    } catch {
      // Network/blocked — fall back to empty metadata; UI prompts manual entry.
    }

    const title = meta(html, "og:title") ?? tagText(html, "title");
    const description = meta(html, "og:description") ?? meta(html, "description");
    const thumbnailUrl = meta(html, "og:image");

    return {
      platform,
      url,
      title,
      description,
      thumbnailUrl,
      text: [title, description].filter(Boolean).join(". "),
    };
  }
}

function meta(html: string, property: string): string | null {
  if (!html) return null;
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

function tagText(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return m ? decodeEntities(m[1].trim()) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function getLinkParser(): LinkParser {
  return new OpenGraphLinkParser();
}
