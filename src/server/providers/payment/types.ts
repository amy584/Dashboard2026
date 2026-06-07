/**
 * PaymentProvider interface (§10/§14). Stripe is the default. Charges only
 * happen after the explicit confirm step (§7) — never autonomously.
 */

export interface CheckoutSessionResult {
  url: string;
}

export interface OneOffChargeInput {
  customerId: string;
  amountCents: number;
  currency: string;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface OneOffChargeResult {
  paymentIntentId: string;
  status: string;
  clientSecret?: string | null;
}

export interface PaymentProvider {
  ensureCustomer(userId: string, email?: string): Promise<string>;
  createSubscriptionCheckout(opts: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;
  createBillingPortal(customerId: string, returnUrl: string): Promise<CheckoutSessionResult>;
  chargeOneOff(input: OneOffChargeInput): Promise<OneOffChargeResult>;
}
