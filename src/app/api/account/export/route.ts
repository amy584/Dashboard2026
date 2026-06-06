import { NextResponse } from "next/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";

/** One-tap data export (§12): all of the user's own data as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const partner = await getPartner(user.id);

  // RLS scopes every query to the caller.
  const [dates, facts, datesNudges, suggestions, actions, inspiration, payments, audit] =
    await Promise.all([
      supabase.from("important_dates").select("*"),
      partner
        ? supabase.from("partner_facts").select("*").eq("partner_id", partner.id)
        : Promise.resolve({ data: [] }),
      supabase.from("nudges").select("*"),
      supabase.from("suggestions").select("*"),
      supabase.from("actions").select("*"),
      supabase.from("inspiration_items").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("audit_log").select("*"),
    ]);

  await logAudit(supabase, user.id, "data_exported", {});

  const payload = {
    exported_at: new Date().toISOString(),
    user,
    partner,
    important_dates: dates.data,
    partner_facts: facts.data,
    nudges: datesNudges.data,
    suggestions: suggestions.data,
    actions: actions.data,
    inspiration_items: inspiration.data,
    payments: payments.data,
    audit_log: audit.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="attent-export.json"',
    },
  });
}
