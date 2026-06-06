"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dict } from "@/lib/i18n";
import type { InspirationCategory, InspirationItemRow } from "@/lib/supabase/types";

interface Preview {
  platform: string;
  source_url: string;
  media_thumbnail_url: string | null;
  caption_text: string | null;
  place_name: string | null;
  place_city: string | null;
  category: InspirationCategory;
  extracted_json: Record<string, unknown>;
}

const CATEGORIES: InspirationCategory[] = ["restaurant", "flowers", "travel", "gift", "other"];

export function InspirationBoard({ userId, partnerId }: { userId: string; partnerId: string | null }) {
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [items, setItems] = useState<InspirationItemRow[]>([]);
  const [filter, setFilter] = useState<InspirationCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("inspiration_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function ingest() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/inspiration/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Kon de link niet ophalen. Vul handmatig in.");
      setPreview(await res.json());
    } catch (err) {
      // Fall back to manual entry (§8) — thin metadata is expected sometimes.
      setError((err as Error).message);
      setPreview({
        platform: /instagram/.test(url) ? "instagram" : "other",
        source_url: url,
        media_thumbnail_url: null,
        caption_text: null,
        place_name: null,
        place_city: null,
        category: "other",
        extracted_json: {},
      });
    } finally {
      setParsing(false);
    }
  }

  async function savePreview(p: Preview) {
    await supabase.from("inspiration_items").insert({
      user_id: userId,
      partner_id: partnerId,
      source_url: p.source_url,
      platform: p.platform as InspirationItemRow["platform"],
      media_thumbnail_url: p.media_thumbnail_url,
      place_name: p.place_name,
      place_city: p.place_city,
      category: p.category,
      caption_text: p.caption_text,
      extracted_json: p.extracted_json,
      added_by: "user",
    });
    setPreview(null);
    setUrl("");
    load();
  }

  async function toFact(item: InspirationItemRow) {
    if (!partnerId) return;
    const value = item.place_name
      ? `${item.place_name}${item.place_city ? `, ${item.place_city}` : ""}`
      : (item.caption_text ?? "");
    if (!value) return;
    await supabase.from("partner_facts").insert({
      partner_id: partnerId,
      category: item.category === "restaurant" ? "food" : item.category === "flowers" ? "flowers" : "wishlist",
      key: item.category,
      value,
      confidence: "inferred",
      source: "reel",
    });
  }

  const visible = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="space-y-6 py-2">
      <h1 className="font-display text-3xl text-navy">{dict.inspiration.title}</h1>

      <section className="card">
        <label className="label">{dict.inspiration.pasteLabel}</label>
        <div className="flex gap-2">
          <input
            className="field"
            placeholder={dict.inspiration.pastePlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn-primary shrink-0" disabled={!url || parsing} onClick={ingest}>
            {parsing ? dict.inspiration.parsing : dict.inspiration.parse}
          </button>
        </div>
        <p className="mt-2 text-sm text-navy/50">{dict.inspiration.pasteHelp}</p>
      </section>

      {preview && (
        <section className="card border-terracotta">
          <h2 className="font-display text-lg text-navy">{dict.inspiration.previewTitle}</h2>
          {error && <p className="mt-1 text-sm text-terracotta">{error}</p>}
          {preview.media_thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.media_thumbnail_url}
              alt=""
              className="mt-3 h-40 w-full rounded-2xl object-cover"
            />
          )}
          <div className="mt-3 space-y-3">
            <Edit label="Naam" value={preview.place_name ?? ""} onChange={(v) => setPreview({ ...preview, place_name: v })} />
            <Edit label="Stad" value={preview.place_city ?? ""} onChange={(v) => setPreview({ ...preview, place_city: v })} />
            <div>
              <label className="label">Categorie</label>
              <select
                className="field"
                value={preview.category}
                onChange={(e) => setPreview({ ...preview, category: e.target.value as InspirationCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setPreview(null)}>
              {dict.common.cancel}
            </button>
            <button className="btn-primary flex-1" onClick={() => savePreview(preview)}>
              {dict.inspiration.saveItem}
            </button>
          </div>
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} label={dict.inspiration.filterAll} onClick={() => setFilter("all")} />
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={filter === c} label={c} onClick={() => setFilter(c)} />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-navy/50">{dict.inspiration.feedEmpty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visible.map((item) => (
            <div key={item.id} className="card">
              <p className="text-xs uppercase tracking-wide text-brass">{item.category}</p>
              <p className="font-medium text-navy">
                {item.place_name ?? item.caption_text ?? item.source_url}
              </p>
              {item.place_city && <p className="text-sm text-navy/55">{item.place_city}</p>}
              <button className="mt-2 text-sm text-terracotta" onClick={() => toFact(item)}>
                {dict.inspiration.toFact}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Edit({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip shrink-0 ${active ? "bg-navy text-cream" : ""}`}
    >
      {label}
    </button>
  );
}
