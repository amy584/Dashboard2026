import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { serverEnv } from "@/lib/env";
import { decryptToken, encryptToken } from "@/server/crypto";
import { GoogleCalendarProvider } from "./google";
import { MockCalendarProvider } from "./mock";
import type { CalendarProvider } from "./types";

type DB = SupabaseClient<Database>;

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

/** Exchange an OAuth code for tokens and store them encrypted at rest (§12). */
export async function storeGoogleConnection(db: DB, userId: string, code: string): Promise<void> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: serverEnv.googleClientId,
      client_secret: serverEnv.googleClientSecret,
      redirect_uri: serverEnv.googleRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const tokens = (await res.json()) as GoogleTokens;

  await db.from("calendar_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      access_token: encryptToken(tokens.access_token),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      scope: tokens.scope ?? null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
}

/** Get a ready-to-use CalendarProvider, refreshing the access token if stale. */
export async function getCalendarProvider(db: DB, userId: string): Promise<CalendarProvider | null> {
  const { data: conn } = await db
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();
  if (!conn) return null;

  // Mock provider when Google isn't configured (local dev).
  if (!process.env.GOOGLE_CLIENT_ID) return new MockCalendarProvider();

  let accessToken = decryptToken(conn.access_token);
  const expired = conn.expires_at ? new Date(conn.expires_at).getTime() < Date.now() + 60_000 : true;

  if (expired && conn.refresh_token) {
    const refresh = decryptToken(conn.refresh_token);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refresh,
        client_id: serverEnv.googleClientId,
        client_secret: serverEnv.googleClientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (res.ok) {
      const tokens = (await res.json()) as GoogleTokens;
      accessToken = tokens.access_token;
      await db
        .from("calendar_connections")
        .update({
          access_token: encryptToken(accessToken),
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq("id", conn.id);
    }
  }

  return new GoogleCalendarProvider(accessToken);
}
