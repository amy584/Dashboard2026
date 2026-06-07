import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import type { SuggestionKind } from "@/lib/supabase/types";

/**
 * Act on a proactive suggestion (Fase 2): mark it self-done (records an action
 * so recency updates and Attent won't re-suggest it straight away) or dismiss.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { suggestionId, op } = (await request.json()) as {
    suggestionId: string;
    op: "self_done" | "dismiss";
  };
  const supabase = await createClient();

  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("kind")
    .eq("id", suggestionId)
    .single();
  if (!suggestion) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (op === "self_done") {
    await supabase.from("actions").insert({
      user_id: user.id,
      suggestion_id: suggestionId,
      kind: suggestion.kind as SuggestionKind,
      mode: "self_done",
      status: "completed",
      details_json: {},
      completed_at: new Date().toISOString(),
    });
    await supabase.from("suggestions").update({ status: "accepted" }).eq("id", suggestionId);
    await logAudit(supabase, user.id, "nudge_completed", { suggestionId, mode: "self_done" });
  } else {
    await supabase.from("suggestions").update({ status: "rejected" }).eq("id", suggestionId);
  }

  return NextResponse.json({ ok: true });
}
