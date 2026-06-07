"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dict, t } from "@/lib/i18n";

export interface SuggestionCardData {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  why: string | null;
  estimatedCostCents: number;
}

function euro(cents: number) {
  return cents > 0 ? `€${(cents / 100).toFixed(2)}` : dict.suggestion.free;
}

/**
 * A proactive suggestion (Fase 2): the idea + the honest "why", with self-do
 * and outsource actions. Outsource routes into the draft+confirm flow keyed by
 * suggestion id.
 */
export function SuggestionCard({ data, onResolved }: { data: SuggestionCardData; onResolved: (id: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(op: "self_done" | "dismiss") {
    setBusy(true);
    await fetch("/api/suggestions/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: data.id, op }),
    });
    onResolved(data.id);
  }

  return (
    <section className="card animate-fade-up">
      <h3 className="font-display text-xl text-navy">{data.title}</h3>
      {data.body && <p className="mt-1 text-navy/70">{data.body}</p>}
      {data.why && (
        <p className="mt-3 rounded-2xl bg-sand/60 p-3 text-sm text-navy/70">
          <span className="font-medium text-navy">{dict.suggestion.why}: </span>
          {data.why}
        </p>
      )}
      <p className="mt-2 text-sm text-navy/55">
        {t(dict.suggestion.estCost, { amount: euro(data.estimatedCostCents) })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="btn-secondary" disabled={busy} onClick={() => act("self_done")}>
          {dict.home.selfDo}
        </button>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => router.push(`/outsource/${data.id}?type=suggestion`)}
        >
          {dict.home.outsource}
        </button>
      </div>
      <div className="mt-2 flex justify-center text-sm text-navy/45">
        <button onClick={() => act("dismiss")} disabled={busy}>
          {dict.home.dismiss}
        </button>
      </div>
    </section>
  );
}
