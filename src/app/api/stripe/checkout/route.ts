import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/server/providers/payment/stripe";
import { publicEnv, serverEnv } from "@/lib/env";

/** Start a subscription checkout for the Attentt membership (§10). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payment = getPaymentProvider();
  const supabase = await createClient();

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    customerId = await payment.ensureCustomer(user.id);
    await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await payment.createSubscriptionCheckout({
    customerId,
    priceId: serverEnv.stripeSubscriptionPriceId,
    successUrl: `${publicEnv.appUrl}/settings?checkout=success`,
    cancelUrl: `${publicEnv.appUrl}/settings?checkout=cancel`,
  });
  return NextResponse.json({ url: session.url });
}
