import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getCalendarProvider } from "@/server/providers/calendar/connection";
import { getFulfilmentProvider } from "@/server/providers/fulfilment/draft";
import { getPaymentProvider } from "@/server/providers/payment/stripe";
import { getAIClient } from "@/server/providers/ai";
import { executeConfirmed, type OutsourceDraft } from "@/server/outsource/service";
import { logAudit } from "@/server/audit";

/**
 * Phase 2 of outsourcing (§7): execute after explicit confirm. Writes the
 * action + calendar event, charges if there's a cost, completes the nudge, and
 * logs every side effect. Idempotent via the action id.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nudgeId, suggestionId, draft, occasion, approvedMessage } = (await request.json()) as {
    nudgeId?: string;
    suggestionId?: string;
    draft: OutsourceDraft;
    occasion: string;
    approvedMessage: string;
  };
  const supabase = await createClient();

  let linkedSuggestionId: string | null = suggestionId ?? null;
  if (nudgeId) {
    const { data: nudge } = await supabase
      .from("nudges")
      .select("suggestion_id")
      .eq("id", nudgeId)
      .single();
    linkedSuggestionId = nudge?.suggestion_id ?? null;
  }

  // Create the action first so its id is the idempotency key for side effects.
  const { data: action, error: actionErr } = await supabase
    .from("actions")
    .insert({
      user_id: user.id,
      suggestion_id: linkedSuggestionId,
      nudge_id: nudgeId ?? null,
      kind: draft.kind,
      mode: "outsourced",
      status: "drafted",
      details_json: draft.fulfilmentDetails,
      message_draft: approvedMessage,
      cost_cents: draft.estimatedCostCents || null,
    })
    .select("id")
    .single();
  if (actionErr || !action) {
    return NextResponse.json({ error: "could_not_create_action" }, { status: 500 });
  }

  const calendar = (await getCalendarProvider(supabase, user.id)) ?? undefined;

  const result = await executeConfirmed(
    {
      calendar,
      fulfilment: getFulfilmentProvider(),
      payment: getPaymentProvider(),
      ai: getAIClient(),
    },
    {
      draft,
      occasion,
      approvedMessage,
      idempotencyKey: action.id,
      stripeCustomerId: user.stripe_customer_id ?? undefined,
    },
  );

  // Record outcome on the action + nudge.
  await supabase
    .from("actions")
    .update({
      status: result.status,
      calendar_event_id: result.calendarEventId,
      completed_at: result.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", action.id);

  if (result.status === "completed") {
    if (nudgeId) {
      await supabase
        .from("nudges")
        .update({ status: "completed", completed_action_id: action.id })
        .eq("id", nudgeId);
    }
    if (linkedSuggestionId) {
      await supabase.from("suggestions").update({ status: "outsourced" }).eq("id", linkedSuggestionId);
    }
  }

  await logAudit(supabase, user.id, "outsource_confirmed", {
    nudgeId: nudgeId ?? null,
    suggestionId: linkedSuggestionId,
    actionId: action.id,
    status: result.status,
  });
  if (result.calendarEventId) {
    await logAudit(supabase, user.id, "calendar_write", { actionId: action.id });
  }

  return NextResponse.json({ result });
}
