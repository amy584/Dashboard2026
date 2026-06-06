import { getCurrentUser, getPartner } from "@/server/db";
import { InspirationBoard } from "./InspirationBoard";

export default async function InspirationPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await getPartner(user.id);
  return <InspirationBoard userId={user.id} partnerId={partner?.id ?? null} />;
}
