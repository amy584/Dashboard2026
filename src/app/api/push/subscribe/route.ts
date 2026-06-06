import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";

/** Persist a Web Push subscription for the signed-in user (§11). */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscription, userAgent } = (await request.json()) as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    userAgent?: string;
  };
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  // Upsert on (user_id, endpoint) so re-subscribing doesn't duplicate.
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" },
  );

  return NextResponse.json({ ok: true });
}
