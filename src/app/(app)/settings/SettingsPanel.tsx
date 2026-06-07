"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enablePush } from "@/lib/push";
import { dict } from "@/lib/i18n";
import type { EscalationTone, PartnerRow, UserRow } from "@/lib/supabase/types";

const TONES: { value: EscalationTone; label: string }[] = [
  { value: "gentle", label: dict.settings.toneGentle },
  { value: "nudge", label: dict.settings.toneStandard },
  { value: "firm", label: dict.settings.tonePersistent },
];

export function SettingsPanel({
  user,
  partner,
  calendarProviders,
}: {
  user: UserRow;
  partner: PartnerRow | null;
  calendarProviders: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [tone, setTone] = useState<EscalationTone>(user.escalation_pref);
  const [quietStart, setQuietStart] = useState(user.quiet_hours_start);
  const [quietEnd, setQuietEnd] = useState(user.quiet_hours_end);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Address state (concierge-prep, Fase 3).
  const [me, setMe] = useState({
    address_line: user.address_line ?? "",
    postal_code: user.postal_code ?? "",
    city: user.city ?? "",
    phone: user.phone ?? "",
  });
  const [her, setHer] = useState({
    address_line: partner?.address_line ?? "",
    postal_code: partner?.postal_code ?? "",
    city: partner?.city ?? "",
  });
  const [addrSaved, setAddrSaved] = useState(false);

  async function savePrefs(next: Partial<UserRow>) {
    await supabase.from("users").update(next).eq("id", user.id);
    setSavedAt(Date.now());
  }

  async function saveAddresses() {
    await supabase.from("users").update(me).eq("id", user.id);
    if (partner) await supabase.from("partners").update(her).eq("id", partner.id);
    setAddrSaved(true);
  }

  async function exportData() {
    const res = await fetch("/api/account/export");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "attent-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteAccount() {
    if (!confirm(dict.settings.deleteConfirm)) return;
    await fetch("/api/account/delete", { method: "POST" });
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function signOut() {
    await supabase.auth.signOut();
    // Let the welcome splash show again on the next login.
    sessionStorage.removeItem("attent_splash_shown");
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="space-y-5 py-2">
      <h1 className="font-display text-3xl text-navy">{dict.settings.title}</h1>

      <Block title={dict.settings.account}>
        <Row label={dict.onboarding.aboutYou.firstName} value={user.first_name ?? "—"} />
        <Row label={dict.settings.partner} value={partner?.name ?? "—"} />
      </Block>

      <Block title={dict.settings.subscription}>
        <Row label="Status" value={user.subscription_status} />
        <button
          className="btn-secondary mt-2 w-full"
          onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const { url } = await res.json();
            if (url) window.location.href = url;
          }}
        >
          {dict.settings.manageBilling}
        </button>
      </Block>

      <Block title={dict.settings.calendar}>
        {calendarProviders.includes("google") ? (
          <Row label="Google" value="Gekoppeld" />
        ) : (
          <a className="btn-secondary block w-full text-center" href="/api/calendar/google/start">
            {dict.settings.connectGoogle}
          </a>
        )}
      </Block>

      <Block title={dict.settings.addresses}>
        <p className="text-sm text-navy/55">{dict.settings.addressesHelp}</p>

        <p className="label mt-4">{dict.settings.yourAddress}</p>
        <div className="space-y-2">
          <input className="field" placeholder={dict.settings.street} value={me.address_line}
            onChange={(e) => { setMe({ ...me, address_line: e.target.value }); setAddrSaved(false); }} />
          <div className="flex gap-2">
            <input className="field" placeholder={dict.settings.postal} value={me.postal_code}
              onChange={(e) => { setMe({ ...me, postal_code: e.target.value }); setAddrSaved(false); }} />
            <input className="field" placeholder={dict.settings.cityField} value={me.city}
              onChange={(e) => { setMe({ ...me, city: e.target.value }); setAddrSaved(false); }} />
          </div>
          <input className="field" placeholder={dict.settings.phone} value={me.phone}
            onChange={(e) => { setMe({ ...me, phone: e.target.value }); setAddrSaved(false); }} />
        </div>

        <p className="label mt-4">{dict.settings.herAddress}</p>
        <div className="space-y-2">
          <input className="field" placeholder={dict.settings.street} value={her.address_line}
            onChange={(e) => { setHer({ ...her, address_line: e.target.value }); setAddrSaved(false); }} />
          <div className="flex gap-2">
            <input className="field" placeholder={dict.settings.postal} value={her.postal_code}
              onChange={(e) => { setHer({ ...her, postal_code: e.target.value }); setAddrSaved(false); }} />
            <input className="field" placeholder={dict.settings.cityField} value={her.city}
              onChange={(e) => { setHer({ ...her, city: e.target.value }); setAddrSaved(false); }} />
          </div>
        </div>

        <button className="btn-primary mt-4 w-full" onClick={saveAddresses}>
          {addrSaved ? dict.common.done : dict.common.save}
        </button>
      </Block>

      <Block title={dict.settings.notifications}>
        <button
          className="btn-secondary w-full"
          onClick={async () => {
            const ok = await enablePush();
            if (ok) await savePrefs({ notifications_enabled: true });
          }}
        >
          {user.notifications_enabled ? dict.common.done : dict.onboarding.permissions.enable}
        </button>

        <label className="label mt-4">{dict.settings.escalationTone}</label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((tt) => (
            <button
              key={tt.value}
              className={`chip justify-center py-2 ${tone === tt.value ? "bg-navy text-cream" : ""}`}
              onClick={() => {
                setTone(tt.value);
                savePrefs({ escalation_pref: tt.value });
              }}
            >
              {tt.label}
            </button>
          ))}
        </div>

        <label className="label mt-4">{dict.settings.quietHours}</label>
        <div className="flex items-center gap-2">
          <HourSelect value={quietStart} onChange={(v) => { setQuietStart(v); savePrefs({ quiet_hours_start: v }); }} />
          <span className="text-navy/50">→</span>
          <HourSelect value={quietEnd} onChange={(v) => { setQuietEnd(v); savePrefs({ quiet_hours_end: v }); }} />
        </div>
        {savedAt && <p className="mt-2 text-sm text-navy/45">{dict.common.done}.</p>}
      </Block>

      <Block title={dict.settings.privacy}>
        <p className="text-sm text-navy/55">{dict.privacy.onboardingNote}</p>
        <button className="btn-secondary mt-3 w-full" onClick={exportData}>
          {dict.settings.exportData}
        </button>
        <button className="btn mt-2 w-full bg-terracotta/10 text-terracotta" onClick={deleteAccount}>
          {dict.settings.deleteAccount}
        </button>
      </Block>

      <button className="btn-navy w-full" onClick={signOut}>
        {dict.settings.signOut}
      </button>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-2 font-display text-lg text-navy">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-navy/60">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}
