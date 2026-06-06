import { createClient } from "@/lib/supabase/server";
import type { PartnerRow, UserRow } from "@/lib/supabase/types";

/** The signed-in app user + their (single, MVP) partner, or null if absent. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;
  const { data } = await supabase.from("users").select("*").eq("auth_id", authUser.id).single();
  return data ?? null;
}

export async function getPartner(userId: string): Promise<PartnerRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** A user is "onboarded" once they have a partner record. */
export async function isOnboarded(userId: string): Promise<boolean> {
  return (await getPartner(userId)) !== null;
}
