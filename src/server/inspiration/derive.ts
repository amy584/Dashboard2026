import type { FactCategory } from "@/lib/supabase/types";

/**
 * Derives structured cheat-sheet facts from a parsed inspiration item (§8/§9).
 * Pure + tested, so the same logic runs whether the parse came from the real
 * AI or the mock. Facts are tagged inferred/reel by the caller.
 */
export interface ReelExtractionLike {
  category?: string | null;
  place_name?: string | null;
  place_city?: string | null;
  cuisine?: string | null;
  flower_type?: string | null;
  vibe?: string | null;
  items?: string[] | null;
}

export interface DerivedFact {
  category: FactCategory;
  key: string;
  value: string;
}

function placeValue(name: string, city?: string | null): string {
  return city ? `${name}, ${city}` : name;
}

export function deriveFactsFromInspiration(input: {
  category: string;
  place_name: string | null;
  place_city: string | null;
  extracted: ReelExtractionLike;
}): DerivedFact[] {
  const out: DerivedFact[] = [];
  const { category, place_name, place_city, extracted } = input;

  // The saved place itself, mapped to the most useful cheat-sheet category.
  if (place_name) {
    const value = placeValue(place_name, place_city);
    if (category === "restaurant") out.push({ category: "food", key: `plek:${place_name}`, value });
    else if (category === "flowers") out.push({ category: "flowers", key: `bloemist:${place_name}`, value });
    else if (category === "gift") out.push({ category: "wishlist", key: `cadeau-idee:${place_name}`, value });
    else out.push({ category: "misc", key: `plek:${place_name}`, value });
  }

  if (extracted.cuisine) out.push({ category: "food", key: "keuken", value: cap(extracted.cuisine) });
  if (extracted.flower_type) out.push({ category: "flowers", key: "bloemsoort", value: cap(extracted.flower_type) });
  if (extracted.vibe) out.push({ category: "misc", key: "sfeer", value: cap(extracted.vibe) });
  for (const item of extracted.items ?? []) {
    if (item && item.trim()) out.push({ category: "wishlist", key: `idee:${item}`, value: cap(item) });
  }

  // De-dupe on category+value.
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = `${f.category}|${f.value.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function cap(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
