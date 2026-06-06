import type { EscalationTone, SuggestionKind } from "@/lib/supabase/types";

/**
 * Escalation copy table (§6), keyed by (kind, level, tone). Kept as editable
 * content rather than hardcoded strings scattered through the engine. Dutch,
 * in brand voice: L0 is a soft idea, higher levels are short and
 * action-forcing but supportive — never mean, never guilt-trippy.
 *
 * {name} and {days} are interpolated by `notificationCopy`.
 */
type CopyEntry = { title: string; body: string };

const FALLBACK: Record<EscalationTone, CopyEntry> = {
  gentle: { title: "Idee voor {name}", body: "Iets leuks plannen deze week?" },
  nudge: { title: "Nog {days} dagen", body: "Eén tik en Attent regelt het." },
  firm: { title: "Nog {days} dagen", body: "Nu plannen? Eén tik, en het staat." },
};

const TABLE: Partial<
  Record<SuggestionKind, Partial<Record<number, Partial<Record<EscalationTone, CopyEntry>>>>>
> = {
  flowers: {
    0: { gentle: { title: "Bloemen voor {name}?", body: "Een klein gebaar dat altijd raak is." } },
    2: { nudge: { title: "Nog {days} dagen", body: "Haar favoriete bloemen, zo geregeld." } },
    3: { firm: { title: "Nog {days} dagen", body: "Bloemen regelen? Eén tik." } },
  },
  reservation: {
    0: { gentle: { title: "Tafel voor twee?", body: "Vrijdag iets leuks met {name}?" } },
    2: { nudge: { title: "Nog {days} dagen", body: "Die plek die ze opsloeg — boek 'm." } },
    3: { firm: { title: "Nog 1 dag", body: "Eén tik en ik regel het." } },
  },
  message: {
    0: { gentle: { title: "Berichtje voor {name}", body: "Soms is een attent woord genoeg." } },
  },
};

export function notificationCopy(
  kind: SuggestionKind,
  level: number,
  tone: EscalationTone,
  vars: { name: string; days: number },
): CopyEntry {
  const entry =
    TABLE[kind]?.[level]?.[tone] ??
    // nearest lower level for this kind+tone
    Object.entries(TABLE[kind] ?? {})
      .filter(([lvl]) => Number(lvl) <= level)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([, byTone]) => byTone?.[tone])
      .find(Boolean) ??
    FALLBACK[tone];

  return {
    title: interpolate(entry.title, vars),
    body: interpolate(entry.body, vars),
  };
}

function interpolate(s: string, vars: { name: string; days: number }): string {
  return s.replace("{name}", vars.name).replace("{days}", String(vars.days));
}
