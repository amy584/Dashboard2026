import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server Supabase client bound to the request's cookies (App Router).
 * Runs as the authenticated user — RLS applies. Use this for anything
 * acting on behalf of a signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` from a Server Component is a no-op; middleware refreshes
          // the session instead. Safe to ignore.
        }
      },
    },
  });
}
