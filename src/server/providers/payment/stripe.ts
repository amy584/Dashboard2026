import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import type {
  CheckoutSessionResult,
  OneOffChargeInput,
  OneOffChargeResult,
  PaymentProvider,
} from "./types";

/** Stripe-backed PaymentProvider (§10). Server-side only. */
export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(serverEnv.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
  }

  get client() {
    return this.stripe;
  }

  async ensureCustomer(userId: string, email?: string): Promise<string> {
    const existing = await this.stripe.customers.search({
      query: `metadata['app_user_id']:'${userId}'`,
    });
    if (existing.data[0]) return existing.data[0].id;
    const created = await this.stripe.customers.create({
      email,
      metadata: { app_user_id: userId },
    });
    return created.id;
  }

  async createSubscriptionCheckout(opts: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: opts.customerId,
      line_items: [{ price: opts.priceId, quantity: 1 }],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    });
    return { url: session.url ?? opts.cancelUrl };
  }

  async createBillingPortal(customerId: string, returnUrl: string): Promise<CheckoutSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async chargeOneOff(input: OneOffChargeInput): Promise<OneOffChargeResult> {
    const intent = await this.stripe.paymentIntents.create(
      {
        customer: input.customerId,
        amount: input.amountCents,
        currency: input.currency,
        description: input.description,
        metadata: input.metadata,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      paymentIntentId: intent.id,
      status: intent.status,
      clientSecret: intent.client_secret,
    };
  }
}

export function getPaymentProvider(): StripePaymentProvider {
  return new StripePaymentProvider();
}
