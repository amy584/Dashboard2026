import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getLinkParser } from "@/server/providers/link/og";
import { getAIClient } from "@/server/providers/ai";
import { logAudit } from "@/server/audit";

/**
 * POST /api/inspiration/ingest { url } → parsed preview (NOT saved).
 *
 * MVP scope (§8): uses ONLY public Open Graph / oEmbed-style metadata plus the
 * AI extractor. It does not authenticate to, scrape, or bypass any platform.
 * The client shows the preview for the user to confirm/edit, then persists the
 * inspiration_item via RLS-scoped insert.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { url } = (await request.json()) as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const parser = getLinkParser();
  const meta = await parser.fetchMetadata(url);

  // Extract structured taste data from public text only.
  const ai = getAIClient();
  const extracted = await ai.extractReel(meta.text);

  const supabase = await createClient();
  await logAudit(supabase, user.id, "reel_ingested", { platform: meta.platform, hadMetadata: !!meta.text });
  await logAudit(supabase, user.id, "ai_call", { purpose: "reel_extraction" });

  return NextResponse.json({
    platform: meta.platform,
    source_url: url,
    media_thumbnail_url: meta.thumbnailUrl,
    caption_text: meta.description ?? meta.title,
    place_name: extracted.place_name,
    place_city: extracted.place_city,
    category: extracted.category,
    extracted_json: extracted,
  });
}
