import { getCurrentUser, getPartner } from "@/server/db";
import { DatesManager } from "./DatesManager";

export default async function DatesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await getPartner(user.id);
  return <DatesManager userId={user.id} partnerId={partner?.id ?? null} />;
}
