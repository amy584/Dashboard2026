import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/db";
import { googleAuthUrl } from "@/server/providers/calendar/google";
import { publicEnv } from "@/lib/env";

/** Begin Google Calendar OAuth (§7). State carries the app user id. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${publicEnv.appUrl}/sign-in`);
  return NextResponse.redirect(googleAuthUrl(user.id));
}
