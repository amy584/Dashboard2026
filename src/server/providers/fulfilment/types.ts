/**
 * FulfilmentProvider interface (§7/§14). MVP produces a *draft* the user
 * confirms — no real booking/order is placed. Real florist/restaurant/retail
 * providers slot in behind this interface later. Every method must be
 * idempotent and side-effect-logged by the caller.
 */

export type FulfilmentKind = "reservation" | "flowers" | "gift";

export interface FulfilmentRequest {
  kind: FulfilmentKind;
  payload: Record<string, unknown>; // e.g. { place_name, city, party_size, time }
}

export interface FulfilmentDraft {
  kind: FulfilmentKind;
  summary: string; // human-readable "what will happen"
  estimatedCostCents: number;
  /** A link/mailto the user can use to complete the booking himself in MVP. */
  externalActionUrl?: string;
  details: Record<string, unknown>;
}

export interface FulfilmentProvider {
  /** Build a draft for the user to confirm. Never books anything. */
  draft(request: FulfilmentRequest): Promise<FulfilmentDraft>;
}
