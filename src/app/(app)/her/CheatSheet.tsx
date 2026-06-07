"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dict } from "@/lib/i18n";
import type { FactCategory, PartnerFactRow, PartnerRow } from "@/lib/supabase/types";

// Display order. Dislikes get a dedicated "avoid" treatment below.
const CATEGORIES: FactCategory[] = [
  "flowers",
  "food",
  "drink",
  "sizes",
  "love_language",
  "wishlist",
  "misc",
];

export function CheatSheet({ partner }: { partner: PartnerRow }) {
  const supabase = createClient();
  const [facts, setFacts] = useState<PartnerFactRow[]>([]);
  const [adding, setAdding] = useState<FactCategory | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("partner_facts").select("*").eq("partner_id", partner.id);
    setFacts(data ?? []);
  }, [supabase, partner.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFact(category: FactCategory, key: string, value: string) {
    await supabase.from("partner_facts").insert({
      partner_id: partner.id,
      category,
      key,
      value,
      confidence: "manual",
      source: "manual",
    });
    setAdding(null);
    load();
  }

  async function remove(id: string) {
    await supabase.from("partner_facts").delete().eq("id", id);
    load();
  }

  async function confirmInferred(id: string) {
    await supabase.from("partner_facts").update({ confidence: "manual" }).eq("id", id);
    load();
  }

  const dislikes = facts.filter((f) => f.category === "dislike");

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-xs uppercase tracking-widest text-stone">{dict.her.title}</p>
        <h1 className="font-display text-3xl text-navy">{partner.name}</h1>
        {partner.term_of_endearment && (
          <p className="italic text-navy/50">“{partner.term_of_endearment}”</p>
        )}
      </header>

      {/* Avoid / no-go list, highlighted (§5). */}
      <section className="card border-l-4 border-terracotta">
        <h2 className="font-display text-lg text-navy">{dict.her.avoid}</h2>
        <p className="text-sm text-navy/55">{dict.her.avoidHelp}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {dislikes.length ? (
            dislikes.map((f) => (
              <span key={f.id} className="chip bg-terracotta/15 text-terracotta">
                {f.value}
                <button className="ml-1" onClick={() => remove(f.id)}>
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-navy/40">{dict.her.emptyCategory}</span>
          )}
          <button className="chip" onClick={() => setAdding("dislike")}>
            + {dict.common.add}
          </button>
        </div>
      </section>

      <h2 className="font-display text-lg text-navy">{dict.her.cheatSheet}</h2>
      {CATEGORIES.map((cat) => {
        const items = facts.filter((f) => f.category === cat);
        return (
          <section key={cat} className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-navy">{dict.her.categories[cat]}</h3>
              <button className="text-sm text-terracotta" onClick={() => setAdding(cat)}>
                {dict.common.add}
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {items.length === 0 && <p className="text-sm text-navy/40">{dict.her.emptyCategory}</p>}
              {items.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-navy">{f.value}</p>
                    <p className="text-xs text-navy/45">
                      {f.source === "reel" ? dict.her.learnedFromReel : dict.her.enteredManually}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {f.confidence === "inferred" && (
                      <button className="text-stone" onClick={() => confirmInferred(f.id)}>
                        {dict.her.confirmFact}
                      </button>
                    )}
                    <button className="text-navy/40" onClick={() => remove(f.id)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {adding && (
        <FactAdder
          category={adding}
          onCancel={() => setAdding(null)}
          onSave={(v) => addFact(adding, adding, v)}
        />
      )}
    </div>
  );
}

function FactAdder({
  category,
  onCancel,
  onSave,
}: {
  category: FactCategory;
  onCancel: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-navy/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-app rounded-3xl bg-cream p-5 shadow-xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl text-navy">{dict.her.categories[category]}</h2>
        <input
          autoFocus
          className="field mt-4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={dict.her.addFact}
        />
        <div className="mt-5 flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel}>
            {dict.common.cancel}
          </button>
          <button className="btn-primary flex-1" disabled={!value.trim()} onClick={() => onSave(value.trim())}>
            {dict.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
