"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dict, t } from "@/lib/i18n";

interface Props {
  nudgeId: string;
  escalationLevel: number;
  title: string;
  daysLeft: number | null;
  suggestion: { title: string; why: string | null } | null;
}

/**
 * The one signature interaction (§13): the accent shifts from calm taupe toward
 * terracotta the longer a nudge stays unactioned. Copy is never guilt-trippy.
 */
export function NudgeCard({ nudgeId, escalationLevel, title, daysLeft, suggestion }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Map escalation level (0..3+) to an accent colour shifting from calm
  // Stone Taupe toward terracotta the longer the nudge stays unactioned (§13).
  const intensity = Math.min(escalationLevel / 3, 1);
  const accent = mix("#7A6E63", "#C96E4B", intensity);

  async function act(op: "complete" | "snooze" | "dismiss") {
    setBusy(true);
    await fetch("/api/nudges/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nudgeId, op }),
    });
    router.refresh();
  }

  return (
    <section
      className="card animate-fade-up border-l-4 transition-colors"
      style={{ borderLeftColor: accent }}
    >
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: accent }}>
        {dict.home.activeNudgeKicker}
      </p>
      <h2 className="mt-1 font-display text-2xl text-navy">{title}</h2>
      {daysLeft !== null && (
        <p className="mt-1 text-sm text-navy/60">
          {daysLeft <= 1 ? dict.common.oneDayLeft : t(dict.common.daysLeft, { n: daysLeft })}
        </p>
      )}

      {suggestion && (
        <div className="mt-4 rounded-2xl bg-sand/60 p-4">
          <p className="font-medium text-navy">{suggestion.title}</p>
          {suggestion.why && <p className="mt-1 text-sm text-navy/55">{suggestion.why}</p>}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="btn-secondary" disabled={busy} onClick={() => act("complete")}>
          {dict.home.selfDo}
        </button>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => router.push(`/outsource/${nudgeId}`)}
        >
          {dict.home.outsource}
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-6 text-sm text-navy/45">
        <button onClick={() => act("snooze")} disabled={busy}>
          {dict.home.snooze}
        </button>
        <button onClick={() => act("dismiss")} disabled={busy}>
          {dict.home.dismiss}
        </button>
      </div>
    </section>
  );
}

/** Linear blend between two hex colours. */
function mix(a: string, b: string, tt: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const r = pa.map((v, i) => Math.round(v + (pb[i] - v) * tt));
  return `rgb(${r[0]}, ${r[1]}, ${r[2]})`;
}
