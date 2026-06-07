import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getAIClient } from "@/server/providers/ai";
import { logAudit } from "@/server/audit";

type DB = SupabaseClient<Database>;

/**
 * Generate 1–3 grounded suggestions for a user/partner (§9). Inputs come from
 * the structured cheat sheet, recent inspiration, the date type and past
 * actions. The AI composes brand-voice copy but is strictly grounded — it only
 * uses the facts we pass and must respect the dislikes/no-go list.
 */
export async function generateSuggestionsForNudge(
  db: DB,
  opts: { userId: string; partnerId: string | null; nudgeId?: string; dateType: string },
): Promise<string[]> {
  const { partnerId } = opts;
  if (!partnerId) return [];

  const [{ data: partner }, { data: facts }, { data: inspiration }, { data: pastActions }] =
    await Promise.all([
      db.from("partners").select("name, term_of_endearment").eq("id", partnerId).single(),
      db.from("partner_facts").select("category, key, value").eq("partner_id", partnerId),
      db
        .from("inspiration_items")
        .select("place_name, place_city, category")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("actions")
        .select("kind")
        .eq("user_id", opts.userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const dislikes = (facts ?? []).filter((f) => f.category === "dislike").map((f) => f.value);

  const ai = getAIClient();
  const generated = await ai.generateSuggestions({
    dateType: opts.dateType,
    partnerName: partner?.name ?? "haar",
    facts: (facts ?? []).filter((f) => f.category !== "dislike"),
    dislikes,
    inspiration: inspiration ?? [],
    pastActionKinds: (pastActions ?? []).map((a) => a.kind),
  });

  await logAudit(db, opts.userId, "ai_call", { purpose: "suggestions", count: generated.length });

  const inserted: string[] = [];
  for (const s of generated) {
    const { data } = await db
      .from("suggestions")
      .insert({
        user_id: opts.userId,
        partner_id: partnerId,
        nudge_id: opts.nudgeId ?? null,
        kind: s.kind,
        title: s.title,
        body: s.body,
        why: s.why,
        payload_json: { ...s.payload, estimatedCostCents: s.estimatedCostCents ?? 0 },
        source: "ai",
        status: "offered",
      })
      .select("id")
      .single();
    if (data) inserted.push(data.id);
  }

  // Link the top suggestion back to the nudge for the Home card.
  if (opts.nudgeId && inserted[0]) {
    await db.from("nudges").update({ suggestion_id: inserted[0] }).eq("id", opts.nudgeId);
  }

  return inserted;
}
