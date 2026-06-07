import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getPaymentProvider } from "@/server/providers/payment/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { logAudit } from "@/server/audit";

/**
 * Stripe webhook (§10). Reconciles subscription state and payments. Uses the
 * raw body for signature verification and the service-role client to write
 * across users. Must be configured with the webhook signing secret.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const body = await request.text();
  const stripe = getPaymentProvider().client;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, serverEnv.stripeWebhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `invalid: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  async function userIdForCustomer(customerId: string): Promise<string | null> {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.id ?? null;
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await userIdForCustomer(sub.customer as string);
      if (userId) {
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;
        await admin.from("users").update({ subscription_status: status }).eq("id", userId);
      }
      break;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = await userIdForCustomer(pi.customer as string);
      if (userId) {
        await admin.from("payments").insert({
          user_id: userId,
          stripe_payment_intent_id: pi.id,
          kind: (pi.metadata?.kind as "outsource_fee" | "gesture_cost") ?? "gesture_cost",
          amount_cents: pi.amount,
          currency: pi.currency,
          status: pi.status,
        });
        await logAudit(admin, userId, "payment_charged", { status: pi.status, amount: pi.amount });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
