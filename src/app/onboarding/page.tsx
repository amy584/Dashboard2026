import { redirect } from "next/navigation";
import { getCurrentUser, isOnboarded } from "@/server/db";
import { OnboardingFlow } from "./OnboardingFlow";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (await isOnboarded(user.id)) redirect("/");
  return <OnboardingFlow userId={user.id} firstName={user.first_name} />;
}
