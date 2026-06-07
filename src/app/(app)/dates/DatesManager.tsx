"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dict, t } from "@/lib/i18n";
import { daysUntil } from "@/server/nudges/engine";
import type { DateType, ImportantDateRow } from "@/lib/supabase/types";

const TYPE_LABELS: Record<DateType, string> = {
  birthday: dict.dates.typeBirthday,
  anniversary: dict.dates.typeAnniversary,
  valentines: dict.dates.typeValentines,
  custom: dict.dates.typeCustom,
  recurring_gesture: dict.dates.typeRecurring,
};

export function DatesManager({ userId, partnerId }: { userId: string; partnerId: string | null }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ImportantDateRow[]>([]);
  const [editing, setEditing] = useState<Partial<ImportantDateRow> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("important_dates").select("*").order("date");
    setRows(data ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(draft: Partial<ImportantDateRow>) {
    if (draft.id) {
      await supabase
        .from("important_dates")
        .update({
          title: draft.title,
          type: draft.type,
          date: draft.date || null,
          recurrence_rule: draft.recurrence_rule || null,
          lead_time_days: draft.lead_time_days,
          is_active: draft.is_active,
        })
        .eq("id", draft.id);
    } else {
      await supabase.from("important_dates").insert({
        user_id: userId,
        partner_id: partnerId,
        title: draft.title ?? "",
        type: (draft.type as DateType) ?? "custom",
        date: draft.date || null,
        recurrence_rule: draft.recurrence_rule || null,
        lead_time_days: draft.lead_time_days ?? 7,
        is_active: true,
      });
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    await supabase.from("important_dates").delete().eq("id", id);
    load();
  }

  async function toggleActive(row: ImportantDateRow) {
    await supabase.from("important_dates").update({ is_active: !row.is_active }).eq("id", row.id);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.date && r.date >= today && r.type !== "recurring_gesture");
  const recurring = rows.filter((r) => r.type === "recurring_gesture" || !r.date);
  const past = rows.filter((r) => r.date && r.date < today && r.type !== "recurring_gesture");

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-navy">{dict.dates.title}</h1>
        <button className="btn-primary" onClick={() => setEditing({ type: "custom", lead_time_days: 7 })}>
          {dict.common.add}
        </button>
      </div>

      {rows.length === 0 && <p className="text-navy/50">{dict.dates.empty}</p>}

      <Group title={dict.dates.upcoming} rows={upcoming} onEdit={setEditing} onToggle={toggleActive} onDelete={remove} showCountdown />
      <Group title={dict.dates.recurring} rows={recurring} onEdit={setEditing} onToggle={toggleActive} onDelete={remove} />
      <Group title={dict.dates.past} rows={past} onEdit={setEditing} onToggle={toggleActive} onDelete={remove} muted />

      {editing && <DateEditor draft={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Group({
  title,
  rows,
  onEdit,
  onToggle,
  onDelete,
  showCountdown,
  muted,
}: {
  title: string;
  rows: ImportantDateRow[];
  onEdit: (r: ImportantDateRow) => void;
  onToggle: (r: ImportantDateRow) => void;
  onDelete: (id: string) => void;
  showCountdown?: boolean;
  muted?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 font-display text-lg text-navy">{title}</h2>
      <div className="space-y-3">
        {rows.map((r) => {
          const dl = showCountdown && r.date ? daysUntil(new Date(r.date), new Date()) : null;
          return (
            <div key={r.id} className={`card ${muted ? "opacity-60" : ""} ${!r.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone">{TYPE_LABELS[r.type]}</p>
                  <p className="font-medium text-navy">{r.title}</p>
                  <p className="text-sm text-navy/55">
                    {r.date ?? r.recurrence_rule ?? "—"}
                    {dl !== null && ` · ${dl <= 1 ? dict.common.oneDayLeft : t(dict.common.daysLeft, { n: dl })}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-sm">
                  <button className="text-terracotta" onClick={() => onEdit(r)}>
                    {dict.common.edit}
                  </button>
                  <button className="text-navy/45" onClick={() => onToggle(r)}>
                    {r.is_active ? dict.dates.active : dict.common.add}
                  </button>
                  <button className="text-navy/40" onClick={() => onDelete(r.id)}>
                    {dict.common.delete}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DateEditor({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<ImportantDateRow>;
  onCancel: () => void;
  onSave: (d: Partial<ImportantDateRow>) => void;
}) {
  const [d, setD] = useState(draft);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-navy/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-app rounded-3xl bg-cream p-5 shadow-xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl text-navy">{dict.dates.addTitle}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">{dict.dates.fieldTitle}</label>
            <input className="field" value={d.title ?? ""} onChange={(e) => setD({ ...d, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{dict.dates.fieldType}</label>
            <select
              className="field"
              value={d.type ?? "custom"}
              onChange={(e) => setD({ ...d, type: e.target.value as DateType })}
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{dict.dates.fieldDate}</label>
            <input
              type="date"
              className="field"
              value={d.date ?? ""}
              onChange={(e) => setD({ ...d, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{dict.dates.fieldLeadTime}</label>
            <input
              type="number"
              min={1}
              className="field"
              value={d.lead_time_days ?? 7}
              onChange={(e) => setD({ ...d, lead_time_days: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel}>
            {dict.common.cancel}
          </button>
          <button className="btn-primary flex-1" disabled={!d.title} onClick={() => onSave(d)}>
            {dict.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
