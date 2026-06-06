import { getCurrentUser, getPartner } from "@/server/db";
import { CheatSheet } from "./CheatSheet";

export default async function HerPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await getPartner(user.id);
  if (!partner) return null;
  return <CheatSheet partner={partner} />;
}
