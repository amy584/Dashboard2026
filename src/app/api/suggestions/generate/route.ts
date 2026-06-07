import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestionsForNudge } from "@/server/suggestions/generate";

/** On-demand suggestion generation for a nudge or date type (§9). */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nudgeId, dateType } = (await request.json()) as { nudgeId?: string; dateType?: string };
  const partner = await getPartner(user.id);
  const supabase = await createClient();

  const ids = await generateSuggestionsForNudge(supabase, {
    userId: user.id,
    partnerId: partner?.id ?? null,
    nudgeId,
    dateType: dateType ?? "custom",
  });

  return NextResponse.json({ suggestionIds: ids });
}
