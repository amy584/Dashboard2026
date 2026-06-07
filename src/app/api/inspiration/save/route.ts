import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { deriveFactsFromInspiration, type ReelExtractionLike } from "@/server/inspiration/derive";
import { logAudit } from "@/server/audit";
import type { InspirationCategory, InspirationPlatform } from "@/lib/supabase/types";

interface SaveBody {
  source_url: string | null;
  platform: InspirationPlatform;
  media_thumbnail_url: string | null;
  caption_text: string | null;
  place_name: string | null;
  place_city: string | null;
  category: InspirationCategory;
  extracted_json: ReelExtractionLike;
}

/**
 * Save a confirmed inspiration item AND automatically learn from it: derive
 * cheat-sheet facts (cuisine, flower type, saved place, gift ideas) and upsert
 * them so Attent "takes knowledge" without the user tapping anything (§8/§9).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as SaveBody;
  const partner = await getPartner(user.id);
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("inspiration_items")
    .insert({
      user_id: user.id,
      partner_id: partner?.id ?? null,
      source_url: body.source_url,
      platform: body.platform,
      media_thumbnail_url: body.media_thumbnail_url,
      place_name: body.place_name,
      place_city: body.place_city,
      category: body.category,
      caption_text: body.caption_text,
      extracted_json: (body.extracted_json ?? {}) as Record<string, unknown>,
      added_by: "user",
    })
    .select("id")
    .single();
  if (error || !item) {
    return NextResponse.json({ error: "could_not_save" }, { status: 500 });
  }

  // Auto-learn into the cheat sheet (only if we have a partner).
  let savedFacts = 0;
  if (partner) {
    const derived = deriveFactsFromInspiration({
      category: body.category,
      place_name: body.place_name,
      place_city: body.place_city,
      extracted: body.extracted_json ?? {},
    });

    if (derived.length) {
      const { data: existing } = await supabase
        .from("partner_facts")
        .select("category, value")
        .eq("partner_id", partner.id);
      const have = new Set((existing ?? []).map((f) => `${f.category}|${f.value.toLowerCase()}`));

      const toInsert = derived
        .filter((f) => !have.has(`${f.category}|${f.value.toLowerCase()}`))
        .map((f) => ({
          partner_id: partner.id,
          category: f.category,
          key: f.key,
          value: f.value,
          confidence: "inferred" as const,
          source: "reel" as const,
        }));

      if (toInsert.length) {
        const { error: factErr } = await supabase.from("partner_facts").insert(toInsert);
        if (!factErr) savedFacts = toInsert.length;
      }
    }
  }

  await logAudit(supabase, user.id, "reel_ingested", {
    itemId: item.id,
    category: body.category,
    learnedFacts: savedFacts,
  });

  return NextResponse.json({ itemId: item.id, savedFacts });
}
