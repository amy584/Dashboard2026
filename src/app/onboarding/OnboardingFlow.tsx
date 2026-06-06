"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enablePush } from "@/lib/push";
import { dict, t } from "@/lib/i18n";
import type { DateType, FactCategory } from "@/lib/supabase/types";

const TOTAL = 5;

interface FactDraft {
  category: FactCategory;
  key: string;
  value: string;
}
interface DateDraft {
  type: DateType;
  title: string;
  date: string;
  recurrence_rule: string | null;
  lead_time_days: number;
}

export function OnboardingFlow({
  userId,
  firstName,
}: {
  userId: string;
  firstName: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [name, setName] = useState(firstName ?? "");
  const [partner, setPartner] = useState({
    name: "",
    term_of_endearment: "",
    birthday: "",
    relationship_start_date: "",
  });
  const [dates, setDates] = useState<DateDraft[]>([]);
  const [facts, setFacts] = useState<FactDraft[]>([]);

  function setFact(category: FactCategory, key: string, value: string) {
    setFacts((prev) => {
      const others = prev.filter((f) => f.key !== key);
      return value.trim() ? [...others, { category, key, value }] : others;
    });
  }
  function factValue(key: string) {
    return facts.find((f) => f.key === key)?.value ?? "";
  }

  function toggleDate(d: DateDraft) {
    setDates((prev) =>
      prev.some((x) => x.type === d.type && x.title === d.title)
        ? prev.filter((x) => !(x.type === d.type && x.title === d.title))
        : [...prev, d],
    );
  }
  const hasDate = (type: DateType) => dates.some((d) => d.type === type);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      // 1. Update the user's first name.
      await supabase.from("users").update({ first_name: name }).eq("id", userId);

      // 2. Create the partner.
      const { data: partnerRow, error: pErr } = await supabase
        .from("partners")
        .insert({
          user_id: userId,
          name: partner.name,
          term_of_endearment: partner.term_of_endearment || null,
          birthday: partner.birthday || null,
          relationship_start_date: partner.relationship_start_date || null,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const partnerId = partnerRow!.id;

      // 3. Key dates. Derive partner birthday/anniversary dates if provided.
      const dateRows = [...dates];
      if (partner.birthday && !hasDate("birthday")) {
        dateRows.push({
          type: "birthday",
          title: `Verjaardag ${partner.name}`,
          date: partner.birthday,
          recurrence_rule: "FREQ=YEARLY",
          lead_time_days: 10,
        });
      }
      if (dateRows.length) {
        await supabase.from("important_dates").insert(
          dateRows.map((d) => ({
            user_id: userId,
            partner_id: partnerId,
            type: d.type,
            title: d.title,
            date: d.date || null,
            recurrence_rule: d.recurrence_rule,
            lead_time_days: d.lead_time_days,
            is_active: true,
          })),
        );
      }

      // 4. Facts (the cheat sheet), all from onboarding.
      if (facts.length) {
        await supabase.from("partner_facts").insert(
          facts.map((f) => ({
            partner_id: partnerId,
            category: f.category,
            key: f.key,
            value: f.value,
            confidence: "manual" as const,
            source: "onboarding" as const,
          })),
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="app-shell px-6 py-8">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-stone">
          {t(dict.onboarding.progress, { step, total: TOTAL })}
        </p>
        {step < TOTAL && (
          <button onClick={() => setStep((s) => Math.min(TOTAL, s + 1))} className="text-sm text-navy/50">
            {dict.common.skip}
          </button>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-terracotta transition-all"
          style={{ width: `${(step / TOTAL) * 100}%` }}
        />
      </div>

      <div className="mt-8 flex-1 animate-fade-up">
        {step === 1 && (
          <Section title={dict.onboarding.aboutYou.title}>
            <Field label={dict.onboarding.aboutYou.firstName}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </Section>
        )}

        {step === 2 && (
          <Section title={dict.onboarding.partner.title}>
            <Field label={dict.onboarding.partner.name}>
              <input
                className="field"
                value={partner.name}
                onChange={(e) => setPartner({ ...partner, name: e.target.value })}
              />
            </Field>
            <Field label={`${dict.onboarding.partner.endearment} (${dict.common.optional})`}>
              <input
                className="field"
                value={partner.term_of_endearment}
                onChange={(e) => setPartner({ ...partner, term_of_endearment: e.target.value })}
              />
            </Field>
            <Field label={`${dict.onboarding.partner.birthday} (${dict.common.optional})`}>
              <input
                type="date"
                className="field"
                value={partner.birthday}
                onChange={(e) => setPartner({ ...partner, birthday: e.target.value })}
              />
            </Field>
            <Field label={`${dict.onboarding.partner.relationshipStart} (${dict.common.optional})`}>
              <input
                type="date"
                className="field"
                value={partner.relationship_start_date}
                onChange={(e) =>
                  setPartner({ ...partner, relationship_start_date: e.target.value })
                }
              />
            </Field>
          </Section>
        )}

        {step === 3 && (
          <Section title={dict.onboarding.dates.title} subtitle={dict.onboarding.dates.subtitle}>
            <Preset
              active={hasDate("anniversary")}
              label={dict.onboarding.dates.addAnniversary}
              onClick={() =>
                toggleDate({
                  type: "anniversary",
                  title: dict.onboarding.dates.addAnniversary,
                  date: partner.relationship_start_date,
                  recurrence_rule: "FREQ=YEARLY",
                  lead_time_days: 14,
                })
              }
            />
            <Preset
              active={hasDate("valentines")}
              label={dict.onboarding.dates.addValentine}
              onClick={() =>
                toggleDate({
                  type: "valentines",
                  title: dict.onboarding.dates.addValentine,
                  date: "",
                  recurrence_rule: "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=14",
                  lead_time_days: 10,
                })
              }
            />
            <Preset
              active={hasDate("recurring_gesture")}
              label={dict.onboarding.dates.addRecurring}
              hint={dict.onboarding.dates.recurringHelp}
              onClick={() =>
                toggleDate({
                  type: "recurring_gesture",
                  title: dict.onboarding.dates.addRecurring,
                  date: "",
                  recurrence_rule: "FREQ=WEEKLY;INTERVAL=3",
                  lead_time_days: 3,
                })
              }
            />
          </Section>
        )}

        {step === 4 && (
          <Section title={dict.onboarding.facts.title} subtitle={dict.onboarding.facts.subtitle}>
            <FactInput
              label={dict.onboarding.facts.flowers}
              value={factValue("favoriete_bloemen")}
              onChange={(v) => setFact("flowers", "favoriete_bloemen", v)}
            />
            <FactInput
              label={dict.onboarding.facts.cuisine}
              value={factValue("favoriete_keuken")}
              onChange={(v) => setFact("food", "favoriete_keuken", v)}
            />
            <FactInput
              label={dict.onboarding.facts.drink}
              value={factValue("drankje")}
              onChange={(v) => setFact("drink", "drankje", v)}
            />
            <FactInput
              label={dict.onboarding.facts.loveLanguage}
              value={factValue("liefdestaal")}
              onChange={(v) => setFact("love_language", "liefdestaal", v)}
            />
            <FactInput
              label={dict.onboarding.facts.dislikes}
              value={factValue("no_go")}
              onChange={(v) => setFact("dislike", "no_go", v)}
            />
          </Section>
        )}

        {step === 5 && (
          <Section
            title={dict.onboarding.permissions.title}
            subtitle={dict.privacy.onboardingNote}
          >
            <PermissionRow
              label={dict.onboarding.permissions.notifications}
              why={dict.onboarding.permissions.notificationsWhy}
              onEnable={async () => {
                await enablePush();
                await supabase.from("users").update({ notifications_enabled: true }).eq("id", userId);
              }}
            />
            <PermissionRow
              label={dict.onboarding.permissions.calendar}
              why={dict.onboarding.permissions.calendarWhy}
              onEnable={() => {
                window.location.href = "/api/calendar/google/start";
              }}
            />
          </Section>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-terracotta">{error}</p>}

      <div className="flex gap-3">
        {step > 1 && (
          <button className="btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
            {dict.common.back}
          </button>
        )}
        {step < TOTAL ? (
          <button
            className="btn-primary flex-1"
            disabled={step === 2 && !partner.name}
            onClick={() => setStep((s) => s + 1)}
          >
            {dict.common.next}
          </button>
        ) : (
          <button className="btn-primary flex-1" disabled={busy} onClick={finish}>
            {busy ? dict.common.loading : dict.onboarding.finish}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl text-navy">{title}</h1>
      {subtitle && <p className="mt-1 text-navy/60">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function FactInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Preset({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex w-full items-center justify-between text-left ${
        active ? "border-terracotta ring-2 ring-terracotta/20" : ""
      }`}
    >
      <span>
        <span className="block font-medium text-navy">{label}</span>
        {hint && <span className="block text-sm text-navy/50">{hint}</span>}
      </span>
      <span className={`chip ${active ? "bg-terracotta text-cream" : ""}`}>
        {active ? "✓" : "+"}
      </span>
    </button>
  );
}

function PermissionRow({
  label,
  why,
  onEnable,
}: {
  label: string;
  why: string;
  onEnable: () => void | Promise<void>;
}) {
  const [done, setDone] = useState(false);
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-navy">{label}</p>
          <p className="text-sm text-navy/55">{why}</p>
        </div>
        <button
          className="btn-secondary shrink-0"
          onClick={async () => {
            await onEnable();
            setDone(true);
          }}
        >
          {done ? dict.common.done : dict.onboarding.permissions.enable}
        </button>
      </div>
    </div>
  );
}
