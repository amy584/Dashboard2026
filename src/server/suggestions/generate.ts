import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SuggestionKind } from "@/lib/supabase/types";
import { getAIClient, type SuggestionInput } from "@/server/providers/ai";
import { logAudit } from "@/server/audit";

type DB = SupabaseClient<Database>;

const KINDS: SuggestionKind[] = ["flowers", "reservation", "gift", "message", "experience"];
const MONTH_MS = 30 * 24 * 3_600_000;

/** Months since the last completed gesture of each kind (null = never). */
function computeRecency(
  actions: { kind: string; completed_at: string | null; created_at: string }[],
): Record<string, number | null> {
  const latest: Record<string, number> = {};
  for (const a of actions) {
    const ts = new Date(a.completed_at ?? a.created_at).getTime();
    if (!latest[a.kind] || ts > latest[a.kind]) latest[a.kind] = ts;
  }
  const out: Record<string, number | null> = {};
  for (const k of KINDS) {
    out[k] = latest[k] ? Math.floor((Date.now() - latest[k]) / MONTH_MS) : null;
  }
  return out;
}

/** Gather the grounded inputs for the AI from the cheat sheet, inspiration and history. */
async function gatherInput(
  db: DB,
  userId: string,
  partnerId: string,
  dateType: string,
): Promise<{ input: SuggestionInput; partnerName: string }> {
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
        .select("kind, completed_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const dislikes = (facts ?? []).filter((f) => f.category === "dislike").map((f) => f.value);

  return {
    partnerName: partner?.name ?? "haar",
    input: {
      dateType,
      partnerName: partner?.name ?? "haar",
      facts: (facts ?? []).filter((f) => f.category !== "dislike"),
      dislikes,
      inspiration: inspiration ?? [],
      pastActionKinds: (pastActions ?? []).map((a) => a.kind),
      monthsSinceByKind: computeRecency(pastActions ?? []),
    },
  };
}

async function storeSuggestions(
  db: DB,
  userId: string,
  partnerId: string,
  nudgeId: string | null,
  generated: Awaited<ReturnType<ReturnType<typeof getAIClient>["generateSuggestions"]>>,
): Promise<string[]> {
  const inserted: string[] = [];
  for (const s of generated) {
    const { data } = await db
      .from("suggestions")
      .insert({
        user_id: userId,
        partner_id: partnerId,
        nudge_id: nudgeId,
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
  return inserted;
}

/** Suggestions tied to a nudge (when a date approaches). */
export async function generateSuggestionsForNudge(
  db: DB,
  opts: { userId: string; partnerId: string | null; nudgeId?: string; dateType: string },
): Promise<string[]> {
  if (!opts.partnerId) return [];
  const { input } = await gatherInput(db, opts.userId, opts.partnerId, opts.dateType);
  const generated = await getAIClient().generateSuggestions(input);
  await logAudit(db, opts.userId, "ai_call", { purpose: "suggestions", count: generated.length });

  const inserted = await storeSuggestions(db, opts.userId, opts.partnerId, opts.nudgeId ?? null, generated);
  if (opts.nudgeId && inserted[0]) {
    await db.from("nudges").update({ suggestion_id: inserted[0] }).eq("id", opts.nudgeId);
  }
  return inserted;
}

/**
 * Proactive, always-on suggestions (Fase 2): grounded in the cheat sheet +
 * recency, not tied to a date. Old offered proactive suggestions are retired
 * first so the Home feed stays fresh and small.
 */
export async function generateProactiveSuggestions(
  db: DB,
  opts: { userId: string; partnerId: string | null },
): Promise<string[]> {
  if (!opts.partnerId) return [];

  // Retire previous proactive (no-nudge) offers so they don't pile up.
  await db
    .from("suggestions")
    .update({ status: "rejected" })
    .eq("user_id", opts.userId)
    .is("nudge_id", null)
    .eq("status", "offered");

  const { input } = await gatherInput(db, opts.userId, opts.partnerId, "spontaan");
  const generated = await getAIClient().generateSuggestions(input);
  await logAudit(db, opts.userId, "ai_call", { purpose: "proactive_suggestions", count: generated.length });

  return storeSuggestions(db, opts.userId, opts.partnerId, null, generated);
}
