import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getCalendarProvider } from "@/server/providers/calendar/connection";
import { getFulfilmentProvider } from "@/server/providers/fulfilment/draft";
import { getAIClient } from "@/server/providers/ai";
import { assembleDraft } from "@/server/outsource/service";
import type { SuggestionKind } from "@/lib/supabase/types";

/**
 * Phase 1 of outsourcing (§7): assemble a draft. No side effects.
 * Works from either a nudge (date-driven) or a proactive suggestion (Fase 2).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nudgeId, suggestionId, manualTime } = (await request.json()) as {
    nudgeId?: string;
    suggestionId?: string;
    manualTime?: string;
  };
  const supabase = await createClient();
  const partner = await getPartner(user.id);

  let suggestionKind: SuggestionKind = "message";
  let payload: Record<string, unknown> = {};
  let occasion = "een attentie";
  let target = new Date();

  if (suggestionId) {
    const { data: s } = await supabase
      .from("suggestions")
      .select("kind, title, payload_json")
      .eq("id", suggestionId)
      .single();
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    suggestionKind = s.kind;
    payload = s.payload_json ?? {};
    occasion = s.title ?? occasion;
    target = nextFriday();
  } else if (nudgeId) {
    const { data: nudge } = await supabase
      .from("nudges")
      .select("*, suggestions!nudges_suggestion_id_fkey(*), important_dates(title)")
      .eq("id", nudgeId)
      .single();
    if (!nudge) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const suggestion = (
      nudge as unknown as {
        suggestions?: { kind: SuggestionKind; payload_json: Record<string, unknown> };
      }
    ).suggestions;
    suggestionKind = suggestion?.kind ?? "message";
    payload = suggestion?.payload_json ?? {};
    occasion =
      (nudge as unknown as { important_dates?: { title: string } }).important_dates?.title ??
      occasion;
    target = nudge.target_date ? new Date(nudge.target_date) : nextFriday();
  } else {
    return NextResponse.json({ error: "missing_target" }, { status: 400 });
  }

  // Window around the target date (a Friday-evening-ish span).
  const from = new Date(target);
  from.setHours(17, 0, 0, 0);
  const to = new Date(target);
  to.setHours(22, 0, 0, 0);

  const calendar = (await getCalendarProvider(supabase, user.id)) ?? undefined;

  const draft = await assembleDraft(
    { calendar, fulfilment: getFulfilmentProvider(), ai: getAIClient() },
    {
      suggestionKind,
      payload,
      partnerName: partner?.name ?? "haar",
      endearment: partner?.term_of_endearment,
      occasion,
      window: { from: from.toISOString(), to: to.toISOString() },
      manualTime,
    },
  );

  return NextResponse.json({ draft, occasion, hasCalendar: !!calendar });
}

/** Next upcoming Friday (for proactive gestures with no fixed date). */
function nextFriday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 5 Fri
  const add = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d;
}
