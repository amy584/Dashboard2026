"use client";

import { useCallback, useEffect, useState } from "react";
import { dict } from "@/lib/i18n";
import { SuggestionCard, type SuggestionCardData } from "@/components/SuggestionCard";

interface SuggestionRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  why: string | null;
  payload_json: Record<string, unknown> | null;
}

function toCard(s: SuggestionRow): SuggestionCardData {
  const cost = Number((s.payload_json as { estimatedCostCents?: number })?.estimatedCostCents ?? 0);
  return { id: s.id, kind: s.kind, title: s.title, body: s.body, why: s.why, estimatedCostCents: cost };
}

/**
 * Proactive "Vandaag" feed (Fase 2). Loads current proactive suggestions on
 * mount (generating a set the first time), with a refresh for new ideas.
 */
export function ProactiveSuggestions() {
  const [items, setItems] = useState<SuggestionCardData[] | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchItems = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/suggestions/proactive${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      setItems(((data.suggestions ?? []) as SuggestionRow[]).map(toCard));
    } catch {
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(false);
  }, [fetchItems]);

  function onResolved(id: string) {
    setItems((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-navy">{dict.home.proactiveTitle}</h2>
        <button
          className="text-sm text-terracotta disabled:opacity-50"
          disabled={busy}
          onClick={() => fetchItems(true)}
        >
          {busy ? dict.home.generating : dict.home.refreshIdeas}
        </button>
      </div>

      {items === null ? (
        <p className="text-sm text-navy/50">{dict.home.generating}</p>
      ) : items.length === 0 ? (
        <div className="card text-center">
          <p className="text-navy/60">{dict.home.proactiveEmpty}</p>
          <button className="btn-secondary mt-3" disabled={busy} onClick={() => fetchItems(true)}>
            {dict.home.generateIdeas}
          </button>
        </div>
      ) : (
        items.map((s) => <SuggestionCard key={s.id} data={s} onResolved={onResolved} />)
      )}
    </section>
  );
}
