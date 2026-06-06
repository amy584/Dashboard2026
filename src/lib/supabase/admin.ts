import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client. BYPASSES RLS — server only.
 * Use exclusively for trusted backend jobs that legitimately act across users:
 * the nudge cron evaluator, Stripe webhooks, and hard-delete cascades.
 * Never import this into a client component or expose its results unfiltered.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
