/**
 * LinkParser interface (§8/§14).
 *
 * IMPORTANT (terms-of-service & privacy): the MVP uses ONLY publicly available
 * metadata (Open Graph / oEmbed-style) plus manual entry. It does NOT log in,
 * scrape authenticated feeds, or bypass any platform authentication. A real
 * Instagram/TikTok integration can replace this behind the same interface.
 */

export interface LinkMetadata {
  platform: "instagram" | "manual" | "other";
  url: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  /** Combined text (title + description) passed to the AI extractor. */
  text: string;
}

export interface LinkParser {
  /** True if this parser handles the given URL. */
  supports(url: string): boolean;
  /** Fetch public metadata only. Returns thin data if little is public. */
  fetchMetadata(url: string): Promise<LinkMetadata>;
}
