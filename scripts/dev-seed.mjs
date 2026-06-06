// Seeds the local Supabase with demo data for screenshots / manual testing.
// Usage: node scripts/dev-seed.mjs   (reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureUser(email, password) {
  // Idempotent-ish: try create, ignore "already registered".
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !/registered|already/i.test(error.message)) throw error;
  let authId = data?.user?.id;
  if (!authId) {
    const { data: list } = await admin.auth.admin.listUsers();
    authId = list.users.find((u) => u.email === email)?.id;
  }
  return authId;
}

async function appUserId(authId) {
  // The on-signup trigger creates public.users; fetch its id.
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.from("users").select("id").eq("auth_id", authId).maybeSingle();
    if (data?.id) return data.id;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("public.users row not created by trigger");
}

async function main() {
  // ── Primary demo user: fully set up ──
  const authId = await ensureUser("daan@attent.test", "attent123");
  const userId = await appUserId(authId);
  await admin.from("users").update({ first_name: "Daan", notifications_enabled: true }).eq("id", userId);

  // Clean prior demo rows for a deterministic screenshot.
  await admin.from("partners").delete().eq("user_id", userId);

  const { data: partner } = await admin
    .from("partners")
    .insert({
      user_id: userId,
      name: "Sanne",
      term_of_endearment: "schat",
      birthday: "1992-09-12",
      relationship_start_date: "2019-06-21",
    })
    .select("id")
    .single();
  const partnerId = partner.id;

  await admin.from("partner_facts").insert([
    { partner_id: partnerId, category: "flowers", key: "favoriete_bloemen", value: "Pioenrozen", confidence: "manual", source: "onboarding" },
    { partner_id: partnerId, category: "food", key: "favoriete_keuken", value: "Italiaans", confidence: "inferred", source: "reel" },
    { partner_id: partnerId, category: "drink", key: "drankje", value: "Oat-milk cappuccino", confidence: "manual", source: "manual" },
    { partner_id: partnerId, category: "love_language", key: "liefdestaal", value: "Quality time", confidence: "manual", source: "onboarding" },
    { partner_id: partnerId, category: "dislike", key: "no_go", value: "Lelies", confidence: "manual", source: "onboarding" },
    { partner_id: partnerId, category: "dislike", key: "no_go", value: "Verrassingsfeestjes", confidence: "manual", source: "manual" },
    { partner_id: partnerId, category: "wishlist", key: "wens", value: "Keramiek workshop", confidence: "inferred", source: "reel" },
  ]);

  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const anniversary = soon.toISOString().slice(0, 10);
  const { data: date } = await admin
    .from("important_dates")
    .insert([
      { user_id: userId, partner_id: partnerId, type: "anniversary", title: "Jullie jubileum", date: anniversary, recurrence_rule: "FREQ=YEARLY", lead_time_days: 14, is_active: true },
      { user_id: userId, partner_id: partnerId, type: "birthday", title: "Verjaardag Sanne", date: "2026-09-12", recurrence_rule: "FREQ=YEARLY", lead_time_days: 10, is_active: true },
      { user_id: userId, partner_id: partnerId, type: "recurring_gesture", title: "Verras haar regelmatig", date: null, recurrence_rule: "FREQ=WEEKLY;INTERVAL=3", lead_time_days: 3, is_active: true },
    ])
    .select("id")
    .limit(1);
  const anniversaryId = date[0].id;

  // A reservation suggestion grounded in a saved reel + an active escalated nudge.
  const { data: suggestion } = await admin
    .from("suggestions")
    .insert({
      user_id: userId,
      partner_id: partnerId,
      kind: "reservation",
      title: "Tafel bij Toscanini",
      body: "Italiaans, precies haar smaak.",
      why: "Ze bewaarde een reel van Toscanini, en Italiaans staat op haar cheat sheet.",
      payload_json: { place_name: "Toscanini", place_city: "Amsterdam", party_size: 2, estimatedCostCents: 0 },
      source: "ai",
      status: "offered",
    })
    .select("id")
    .single();

  const { data: nudge } = await admin
    .from("nudges")
    .insert({
      user_id: userId,
      important_date_id: anniversaryId,
      status: "active",
      scheduled_for: new Date(Date.now() - 86400000).toISOString(),
      target_date: anniversary,
      escalation_level: 2,
      suggestion_id: suggestion.id,
      next_escalation_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select("id")
    .single();

  await admin.from("inspiration_items").insert([
    { user_id: userId, partner_id: partnerId, source_url: "https://instagram.com/reel/abc", platform: "instagram", place_name: "Toscanini", place_city: "Amsterdam", category: "restaurant", caption_text: "Beste pasta van de stad 🍝", extracted_json: { cuisine: "italian" }, added_by: "partner_shared" },
    { user_id: userId, partner_id: partnerId, source_url: "https://instagram.com/reel/def", platform: "instagram", place_name: "Studio Klei", place_city: "Utrecht", category: "gift", caption_text: "Keramiek workshop voor twee", extracted_json: {}, added_by: "user" },
  ]);

  // ── Second user with NO partner, for onboarding screenshots ──
  const newAuthId = await ensureUser("nieuw@attent.test", "attent123");
  const newUserId = await appUserId(newAuthId);
  await admin.from("partners").delete().eq("user_id", newUserId);

  console.log(JSON.stringify({ userId, partnerId, nudgeId: nudge.id, suggestionId: suggestion.id }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
