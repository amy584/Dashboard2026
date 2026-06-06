import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getCalendarProvider } from "@/server/providers/calendar/connection";
import { getFulfilmentProvider } from "@/server/providers/fulfilment/draft";
import { getAIClient } from "@/server/providers/ai";
import { assembleDraft } from "@/server/outsource/service";
import type { SuggestionKind } from "@/lib/supabase/types";

/** Phase 1 of outsourcing (§7): assemble a draft. No side effects. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nudgeId, manualTime } = (await request.json()) as {
    nudgeId: string;
    manualTime?: string;
  };
  const supabase = await createClient();
  const partner = await getPartner(user.id);

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
  const occasion =
    (nudge as unknown as { important_dates?: { title: string } }).important_dates?.title ??
    "een attentie";

  // Window around the target date (a Friday-evening-ish span).
  const target = nudge.target_date ? new Date(nudge.target_date) : new Date();
  const from = new Date(target);
  from.setHours(17, 0, 0, 0);
  const to = new Date(target);
  to.setHours(22, 0, 0, 0);

  const calendar = (await getCalendarProvider(supabase, user.id)) ?? undefined;

  const draft = await assembleDraft(
    { calendar, fulfilment: getFulfilmentProvider(), ai: getAIClient() },
    {
      suggestionKind: suggestion?.kind ?? "message",
      payload: suggestion?.payload_json ?? {},
      partnerName: partner?.name ?? "haar",
      endearment: partner?.term_of_endearment,
      occasion,
      window: { from: from.toISOString(), to: to.toISOString() },
      manualTime,
    },
  );

  return NextResponse.json({ draft, occasion, hasCalendar: !!calendar });
}
