import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getPartner } from "@/server/db";
import { dict, t } from "@/lib/i18n";
import { daysUntil } from "@/server/nudges/engine";
import { NudgeCard } from "@/components/NudgeCard";
import { ProactiveSuggestions } from "@/components/ProactiveSuggestions";

/** Home / Today (§5): the most relevant thing right now. */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await getPartner(user.id);
  const supabase = await createClient();

  // Active nudge (if any) with its suggestion.
  const { data: activeNudge } = await supabase
    .from("nudges")
    // Disambiguate: two FKs exist between nudges and suggestions, so name the one
    // that points from this nudge to its chosen suggestion.
    .select("*, suggestions!nudges_suggestion_id_fkey(*), important_dates(title, type)")
    .in("status", ["active", "snoozed"])
    .order("escalation_level", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Upcoming dates strip.
  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("important_dates")
    .select("*")
    .eq("is_active", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(8);

  const greeting = user.first_name ? `Hé ${user.first_name}.` : "Hé.";

  return (
    <div className="space-y-6 py-2">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-widest text-stone">{dict.brand.name}</p>
        <h1 className="font-display text-3xl text-navy">{greeting}</h1>
      </header>

      {activeNudge && (
        <NudgeCard
          nudgeId={activeNudge.id}
          escalationLevel={activeNudge.escalation_level}
          title={
            (activeNudge as unknown as { important_dates?: { title: string } }).important_dates
              ?.title ?? "Tijd voor een attentie"
          }
          daysLeft={
            activeNudge.target_date
              ? daysUntil(new Date(activeNudge.target_date), new Date())
              : null
          }
          suggestion={
            (activeNudge as unknown as { suggestions?: { title: string; why: string | null } })
              .suggestions ?? null
          }
        />
      )}

      {/* Proactive, always-on ideas grounded in the cheat sheet + recency (Fase 2). */}
      <ProactiveSuggestions />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-navy">{dict.home.nextUp}</h2>
          <Link href="/dates" className="text-sm text-terracotta">
            {dict.nav.dates}
          </Link>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {upcoming.map((d) => {
              const dl = d.date ? daysUntil(new Date(d.date), new Date()) : null;
              return (
                <div key={d.id} className="card min-w-[160px] shrink-0">
                  <p className="text-xs uppercase tracking-wide text-stone">
                    {dateTypeLabel(d.type)}
                  </p>
                  <p className="mt-1 font-medium text-navy">{d.title}</p>
                  {dl !== null && (
                    <p className="mt-2 text-sm text-navy/60">
                      {dl <= 1 ? dict.common.oneDayLeft : t(dict.common.daysLeft, { n: dl })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-navy/50">{dict.dates.empty}</p>
        )}
      </section>

      {partner && (
        <p className="text-center text-sm italic text-navy/40">{dict.brand.tagline}</p>
      )}
    </div>
  );
}

function dateTypeLabel(type: string): string {
  const map: Record<string, string> = {
    birthday: dict.dates.typeBirthday,
    anniversary: dict.dates.typeAnniversary,
    valentines: dict.dates.typeValentines,
    custom: dict.dates.typeCustom,
    recurring_gesture: dict.dates.typeRecurring,
  };
  return map[type] ?? type;
}
