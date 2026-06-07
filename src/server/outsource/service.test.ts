import { describe, it, expect, vi } from "vitest";
import { assembleDraft, executeConfirmed, type OutsourceContext } from "./service";
import { MockCalendarProvider } from "@/server/providers/calendar/mock";
import { DraftFulfilmentProvider } from "@/server/providers/fulfilment/draft";
import { MockAIClient } from "@/server/providers/ai/mock";
import type { PaymentProvider } from "@/server/providers/payment/types";

function ctx(overrides: Partial<OutsourceContext> = {}): OutsourceContext {
  return {
    calendar: new MockCalendarProvider(),
    fulfilment: new DraftFulfilmentProvider(),
    ai: new MockAIClient(),
    ...overrides,
  };
}

describe("assembleDraft", () => {
  it("proposes a calendar slot and drafts a reservation + message (no side effects)", async () => {
    const draft = await assembleDraft(ctx(), {
      suggestionKind: "reservation",
      payload: { place_name: "Lucia", place_city: "Rotterdam", party_size: 2 },
      partnerName: "Sanne",
      occasion: "Jullie jubileum",
      window: { from: "2026-02-13T17:00:00Z", to: "2026-02-13T22:00:00Z" },
    });
    expect(draft.kind).toBe("reservation");
    expect(draft.summary).toContain("Lucia");
    expect(draft.proposedTime).toBe("2026-02-13T17:00:00Z");
    expect(draft.messageDraft).toContain("Sanne");
  });

  it("honours a manual time when no calendar window is given", async () => {
    const draft = await assembleDraft(ctx({ calendar: undefined }), {
      suggestionKind: "flowers",
      payload: { flower_type: "pioenrozen", estimatedCostCents: 4200 },
      partnerName: "Sanne",
      occasion: "Zomaar",
      manualTime: "2026-03-01T10:00:00Z",
    });
    expect(draft.proposedTime).toBe("2026-03-01T10:00:00Z");
    expect(draft.estimatedCostCents).toBe(4200);
  });
});

describe("executeConfirmed", () => {
  it("writes a calendar event and reports completed for a free gesture", async () => {
    const c = ctx();
    const draft = await assembleDraft(c, {
      suggestionKind: "reservation",
      payload: { place_name: "Lucia", party_size: 2 },
      partnerName: "Sanne",
      occasion: "Jubileum",
      manualTime: "2026-02-13T19:00:00Z",
    });
    const result = await executeConfirmed(c, {
      draft,
      occasion: "Jubileum",
      approvedMessage: "Tot vrijdag x",
      idempotencyKey: "abc123",
    });
    expect(result.status).toBe("completed");
    expect(result.calendarEventId).toBe("mock_cal_abc123");
    expect(result.paymentIntentId).toBeNull();
  });

  it("charges via Stripe when there is a cost", async () => {
    const payment: PaymentProvider = {
      ensureCustomer: vi.fn(),
      createSubscriptionCheckout: vi.fn(),
      createBillingPortal: vi.fn(),
      chargeOneOff: vi.fn().mockResolvedValue({ paymentIntentId: "pi_1", status: "succeeded" }),
    };
    const c = ctx({ payment });
    const draft = await assembleDraft(c, {
      suggestionKind: "flowers",
      payload: { flower_type: "pioenrozen", estimatedCostCents: 4200 },
      partnerName: "Sanne",
      occasion: "Zomaar",
      manualTime: "2026-03-01T10:00:00Z",
    });
    const result = await executeConfirmed(c, {
      draft,
      occasion: "Zomaar",
      approvedMessage: "x",
      idempotencyKey: "key1",
      stripeCustomerId: "cus_1",
    });
    expect(payment.chargeOneOff).toHaveBeenCalledOnce();
    expect(result.paymentIntentId).toBe("pi_1");
    expect(result.status).toBe("completed");
  });

  it("rolls back the calendar event if the charge fails", async () => {
    const calendar = new MockCalendarProvider();
    const deleteSpy = vi.spyOn(calendar, "deleteEvent");
    const payment: PaymentProvider = {
      ensureCustomer: vi.fn(),
      createSubscriptionCheckout: vi.fn(),
      createBillingPortal: vi.fn(),
      chargeOneOff: vi.fn().mockRejectedValue(new Error("card_declined")),
    };
    const c = ctx({ calendar, payment });
    const draft = await assembleDraft(c, {
      suggestionKind: "flowers",
      payload: { flower_type: "pioenrozen", estimatedCostCents: 4200 },
      partnerName: "Sanne",
      occasion: "Zomaar",
      manualTime: "2026-03-01T10:00:00Z",
    });
    const result = await executeConfirmed(c, {
      draft,
      occasion: "Zomaar",
      approvedMessage: "x",
      idempotencyKey: "key2",
      stripeCustomerId: "cus_1",
    });
    expect(result.status).toBe("failed");
    expect(result.calendarEventId).toBeNull();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
