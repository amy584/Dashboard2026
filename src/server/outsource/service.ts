/**
 * Outsource flow orchestration (§7): draft + confirm. Providers are injected
 * so the flow is fully testable with mocks and so real booking/payment
 * providers can slot in. Every external side effect is idempotent and the
 * caller logs it to the audit log.
 *
 * The two phases are deliberately separate:
 *  - `assembleDraft`  → no side effects; produces what the user will confirm.
 *  - `executeConfirmed` → runs only after explicit user confirm; calendar +
 *    payment writes happen here, idempotent and rolled back on failure.
 */

import type { CalendarProvider } from "@/server/providers/calendar/types";
import type { FulfilmentProvider, FulfilmentKind } from "@/server/providers/fulfilment/types";
import type { PaymentProvider } from "@/server/providers/payment/types";
import type { AIClient } from "@/server/providers/ai/types";
import type { SuggestionKind } from "@/lib/supabase/types";

export interface OutsourceContext {
  calendar?: CalendarProvider;
  fulfilment: FulfilmentProvider;
  payment?: PaymentProvider;
  ai: AIClient;
}

export interface DraftRequest {
  suggestionKind: SuggestionKind;
  payload: Record<string, unknown>;
  partnerName: string;
  endearment?: string | null;
  occasion: string;
  /** Window to search the calendar for a free slot (ISO). */
  window?: { from: string; to: string };
  durationMinutes?: number;
  /** User-picked time when no calendar is connected. */
  manualTime?: string;
}

export interface OutsourceDraft {
  kind: SuggestionKind;
  summary: string;
  proposedTime: string | null;
  estimatedCostCents: number;
  messageDraft: string;
  fulfilmentDetails: Record<string, unknown>;
  externalActionUrl?: string;
}

const FULFILLABLE: SuggestionKind[] = ["reservation", "flowers", "gift"];

/** Phase 1 — assemble a draft for the user to confirm. No side effects. */
export async function assembleDraft(
  ctx: OutsourceContext,
  req: DraftRequest,
): Promise<OutsourceDraft> {
  // 1. Find a time: calendar free slot near the date, else the manual pick.
  let proposedTime = req.manualTime ?? null;
  if (!proposedTime && ctx.calendar && req.window) {
    const slots = await ctx.calendar.findFreeSlots({
      from: req.window.from,
      to: req.window.to,
      durationMinutes: req.durationMinutes ?? 120,
    });
    proposedTime = slots[0]?.start ?? null;
  }

  // 2. Build the gesture draft (no booking).
  let summary = "";
  let estimatedCostCents = 0;
  let fulfilmentDetails: Record<string, unknown> = {};
  let externalActionUrl: string | undefined;

  if (FULFILLABLE.includes(req.suggestionKind)) {
    const draft = await ctx.fulfilment.draft({
      kind: req.suggestionKind as FulfilmentKind,
      payload: { ...req.payload, time: proposedTime ?? req.payload.time },
    });
    summary = draft.summary;
    estimatedCostCents = draft.estimatedCostCents;
    fulfilmentDetails = draft.details;
    externalActionUrl = draft.externalActionUrl;
  } else {
    summary = `Een persoonlijk bericht voor ${req.partnerName}.`;
  }

  // 3. Always draft a partner message in the user's voice.
  const messageDraft = await ctx.ai.draftPartnerMessage({
    partnerName: req.partnerName,
    endearment: req.endearment,
    occasion: req.occasion,
    gestureSummary: summary,
  });

  return {
    kind: req.suggestionKind,
    summary,
    proposedTime,
    estimatedCostCents,
    messageDraft,
    fulfilmentDetails,
    externalActionUrl,
  };
}

export interface ConfirmRequest {
  draft: OutsourceDraft;
  occasion: string;
  /** Final (possibly edited) message the user approved. */
  approvedMessage: string;
  /** Stable key so calendar/payment writes are idempotent on retry. */
  idempotencyKey: string;
  stripeCustomerId?: string;
  location?: string;
}

export interface OutsourceResult {
  calendarEventId: string | null;
  paymentIntentId: string | null;
  status: "completed" | "failed";
  messageDraft: string;
}

/**
 * Phase 2 — execute after explicit confirm. Writes a calendar event and, if
 * there's a cost, charges via Stripe. Rolls the calendar event back if the
 * charge fails so nothing is half-done.
 */
export async function executeConfirmed(
  ctx: OutsourceContext,
  req: ConfirmRequest,
): Promise<OutsourceResult> {
  let calendarEventId: string | null = null;
  let paymentIntentId: string | null = null;

  // Calendar write (idempotent via key).
  if (ctx.calendar && req.draft.proposedTime) {
    const start = req.draft.proposedTime;
    const end = new Date(new Date(start).getTime() + 120 * 60_000).toISOString();
    const event = await ctx.calendar.createEvent(
      {
        summary: `${req.occasion} — ${req.draft.summary}`,
        description: req.approvedMessage,
        start,
        end,
        location: req.location,
      },
      `cal_${req.idempotencyKey}`,
    );
    calendarEventId = event.eventId;
  }

  // Payment (only if there's a real cost and a customer).
  if (req.draft.estimatedCostCents > 0 && ctx.payment && req.stripeCustomerId) {
    try {
      const charge = await ctx.payment.chargeOneOff({
        customerId: req.stripeCustomerId,
        amountCents: req.draft.estimatedCostCents,
        currency: "eur",
        description: req.draft.summary,
        idempotencyKey: `pay_${req.idempotencyKey}`,
        metadata: { kind: req.draft.kind },
      });
      paymentIntentId = charge.paymentIntentId;
    } catch (err) {
      // Roll back the calendar event so the gesture isn't half-committed.
      if (calendarEventId && ctx.calendar) {
        await ctx.calendar.deleteEvent(calendarEventId).catch(() => {});
      }
      return {
        calendarEventId: null,
        paymentIntentId: null,
        status: "failed",
        messageDraft: req.approvedMessage,
      };
    }
  }

  return {
    calendarEventId,
    paymentIntentId,
    status: "completed",
    messageDraft: req.approvedMessage,
  };
}
