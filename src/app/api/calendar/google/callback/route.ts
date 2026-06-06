import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { storeGoogleConnection } from "@/server/providers/calendar/connection";
import { logAudit } from "@/server/audit";
import { publicEnv } from "@/lib/env";

/** Google OAuth callback: stores encrypted tokens, returns to settings. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${publicEnv.appUrl}/sign-in`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // State must match the signed-in user to prevent connection fixation.
  if (!code || state !== user.id) {
    return NextResponse.redirect(`${publicEnv.appUrl}/settings?calendar=error`);
  }

  const supabase = await createClient();
  await storeGoogleConnection(supabase, user.id, code);
  await logAudit(supabase, user.id, "calendar_write", { action: "connected", provider: "google" });

  return NextResponse.redirect(`${publicEnv.appUrl}/settings?calendar=connected`);
}
