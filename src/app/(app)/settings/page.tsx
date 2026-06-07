import { getCurrentUser, getPartner } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "./SettingsPanel";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await getPartner(user.id);
  const supabase = await createClient();
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("provider");

  return (
    <SettingsPanel
      user={user}
      partnerName={partner?.name ?? null}
      calendarProviders={(connections ?? []).map((c) => c.provider)}
    />
  );
}
