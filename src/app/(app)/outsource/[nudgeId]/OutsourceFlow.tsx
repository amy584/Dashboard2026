"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dict, t } from "@/lib/i18n";

interface Draft {
  kind: string;
  summary: string;
  proposedTime: string | null;
  estimatedCostCents: number;
  messageDraft: string;
  fulfilmentDetails: Record<string, unknown>;
  externalActionUrl?: string;
  providerName?: string;
  checklist?: string[];
}

function euro(cents: number) {
  return cents > 0 ? `€${(cents / 100).toFixed(2)}` : dict.suggestion.free;
}

export function OutsourceFlow({ id, source }: { id: string; source: "nudge" | "suggestion" }) {
  const router = useRouter();
  const targetBody = source === "suggestion" ? { suggestionId: id } : { nudgeId: id };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [occasion, setOccasion] = useState("");
  const [message, setMessage] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasCalendar, setHasCalendar] = useState(true);
  const [phase, setPhase] = useState<"loading" | "review" | "done" | "failed">("loading");
  const [busy, setBusy] = useState(false);

  async function loadDraft(time?: string) {
    setPhase("loading");
    const res = await fetch("/api/outsource/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...targetBody, manualTime: time }),
    });
    const data = await res.json();
    setDraft(data.draft);
    setOccasion(data.occasion);
    setMessage(data.draft.messageDraft);
    setHasCalendar(data.hasCalendar);
    setPhase("review");
  }

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function confirm() {
    if (!draft) return;
    setBusy(true);
    const res = await fetch("/api/outsource/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...targetBody, draft, occasion, approvedMessage: message }),
    });
    const { result } = await res.json();
    setPhase(result?.status === "completed" ? "done" : "failed");
    setBusy(false);
  }

  if (phase === "loading") {
    return (
      <div className="flex h-full items-center justify-center py-20 text-navy/60">
        {hasCalendar ? dict.outsource.checkingCalendar : dict.common.loading}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center py-20 text-center animate-fade-up">
        <h1 className="font-display text-4xl text-navy">{dict.outsource.successTitle}</h1>
        <p className="mt-2 text-navy/60">{dict.outsource.successBody}</p>
        <button className="btn-primary mt-8" onClick={() => router.push("/")}>
          {dict.common.done}
        </button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="flex h-full flex-col items-center justify-center py-20 text-center">
        <p className="text-terracotta">Er ging iets mis. Er is niets geboekt of betaald.</p>
        <button className="btn-secondary mt-6" onClick={() => loadDraft(manualTime)}>
          {dict.common.back}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      <button className="text-sm text-navy/50" onClick={() => router.back()}>
        ← {dict.common.back}
      </button>
      <h1 className="font-display text-3xl text-navy">{dict.outsource.title}</h1>

      <section className="card">
        <h2 className="font-display text-lg text-navy">{dict.outsource.summary}</h2>
        <p className="mt-1 text-navy/70">{draft?.summary}</p>
        <p className="mt-2 text-sm text-navy/55">
          {t(dict.suggestion.estCost, { amount: euro(draft?.estimatedCostCents ?? 0) })}
        </p>
        {draft?.proposedTime && (
          <p className="mt-1 text-sm text-navy/55">
            {new Date(draft.proposedTime).toLocaleString("nl-NL")}
          </p>
        )}
        {!hasCalendar && (
          <div className="mt-3">
            <label className="label">{dict.outsource.pickTime}</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                className="field min-w-0 flex-1"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
              <button
                className="btn-secondary shrink-0 px-4"
                onClick={() => loadDraft(new Date(manualTime).toISOString())}
                disabled={!manualTime}
              >
                {dict.common.confirm}
              </button>
            </div>
          </div>
        )}
      </section>

      {draft && draft.checklist && draft.checklist.length > 0 && (
        <section className="card border-l-4 border-terracotta">
          <h2 className="font-display text-lg text-navy">{dict.outsource.prepTitle}</h2>
          <ul className="mt-2 space-y-1.5">
            {draft.checklist.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-navy/80">
                <span className="text-terracotta">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-navy/50">{dict.outsource.prepHelp}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard?.writeText((draft.checklist ?? []).join("\n"));
                setCopied(true);
              }}
            >
              {copied ? dict.outsource.copied : dict.outsource.copyDetails}
            </button>
            {draft.externalActionUrl && (
              <a
                className="btn-primary text-center"
                href={draft.externalActionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {draft.providerName
                  ? t(dict.outsource.openAt, { provider: draft.providerName })
                  : dict.outsource.openGeneric}
              </a>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <label className="label">{t(dict.outsource.messageTitle, { name: occasion })}</label>
        <textarea
          className="field min-h-28"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-1 text-sm text-navy/50">{dict.outsource.messageHelp}</p>
        <button
          className="btn-secondary mt-2 w-full"
          onClick={() => {
            if (navigator.share) navigator.share({ text: message });
            else navigator.clipboard?.writeText(message);
          }}
        >
          Deel / kopieer
        </button>
      </section>

      <p className="text-center text-sm text-navy/50">{dict.outsource.confirmHelp}</p>
      <button className="btn-primary w-full" disabled={busy} onClick={confirm}>
        {busy ? dict.common.loading : dict.outsource.confirmCta}
      </button>
    </div>
  );
}
