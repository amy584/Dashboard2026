import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { evaluateNudges } from "@/server/nudges/evaluate";

/**
 * Scheduled nudge evaluation (§6). Call every 15–30 min from a Supabase
 * scheduled Edge Function or Vercel Cron. Protected by NUDGE_CRON_SECRET so it
 * can't be triggered publicly. Uses the service-role client to scan all users.
 */
export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secretParam = new URL(request.url).searchParams.get("secret");
  const expected = `Bearer ${serverEnv.nudgeCronSecret}`;
  if (auth !== expected && secretParam !== serverEnv.nudgeCronSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const summary = await evaluateNudges(createAdminClient());
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = run;
export const POST = run;
