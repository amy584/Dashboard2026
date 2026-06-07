import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/db";
import { logAudit } from "@/server/audit";

/** Self-do / snooze / dismiss a nudge. RLS scopes everything to the caller. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nudgeId, op } = (await request.json()) as {
    nudgeId: string;
    op: "complete" | "snooze" | "dismiss";
  };
  const supabase = await createClient();

  if (op === "complete") {
    const { data: action } = await supabase
      .from("actions")
      .insert({
        user_id: user.id,
        kind: "message",
        mode: "self_done",
        status: "completed",
        details_json: {},
      })
      .select("id")
      .single();
    await supabase
      .from("nudges")
      .update({ status: "completed", completed_action_id: action?.id ?? null })
      .eq("id", nudgeId);
    await logAudit(supabase, user.id, "nudge_completed", { nudgeId, mode: "self_done" });
  } else if (op === "snooze") {
    const next = new Date(Date.now() + 24 * 3_600_000).toISOString();
    await supabase
      .from("nudges")
      .update({ status: "snoozed", next_escalation_at: next })
      .eq("id", nudgeId);
  } else {
    await supabase.from("nudges").update({ status: "dismissed" }).eq("id", nudgeId);
  }

  return NextResponse.json({ ok: true });
}
