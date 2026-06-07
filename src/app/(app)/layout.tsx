import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { LoginSplash } from "@/components/LoginSplash";
import { getCurrentUser, isOnboarded } from "@/server/db";

/**
 * Authenticated app shell: mobile column + bottom tab bar (§5). Anyone who
 * hasn't completed onboarding (no partner yet) is sent there first.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!(await isOnboarded(user.id))) redirect("/onboarding");

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      <LoginSplash firstName={user.first_name} />
      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-[max(env(safe-area-inset-top),1rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
