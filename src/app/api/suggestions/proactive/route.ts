import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { generateProactiveSuggestions } from "@/server/suggestions/generate";

export const dynamic = "force-dynamic";

/**
 * Proactive "Vandaag" suggestions (Fase 2). Returns the current offered
 * proactive suggestions (nudge_id NULL); generates a fresh set if there are
 * none, or if `?refresh=1` is passed. Generation calls the AI, so we only do it
 * on demand — not on every page load.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const partner = await getPartner(user.id);
  if (!partner) return NextResponse.json({ suggestions: [] });

  const supabase = await createClient();
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  const existing = await supabase
    .from("suggestions")
    .select("*")
    .is("nudge_id", null)
    .eq("status", "offered")
    .order("created_at", { ascending: false });

  if (refresh || !existing.data || existing.data.length === 0) {
    await generateProactiveSuggestions(supabase, { userId: user.id, partnerId: partner.id });
    const fresh = await supabase
      .from("suggestions")
      .select("*")
      .is("nudge_id", null)
      .eq("status", "offered")
      .order("created_at", { ascending: false });
    return NextResponse.json({ suggestions: fresh.data ?? [] });
  }

  return NextResponse.json({ suggestions: existing.data });
}
