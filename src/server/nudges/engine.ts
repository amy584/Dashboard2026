/**
 * Pure nudge/escalation logic (§6). No DB or network here — everything is a
 * function of its inputs so it can be unit-tested deterministically and so the
 * day-based timings can be compressed to minutes for local testing.
 */

import type { EscalationTone } from "@/lib/supabase/types";

export interface EscalationRule {
  level: number;
  delayHours: number;
  tone: EscalationTone;
}

export interface NudgeState {
  status: "scheduled" | "active" | "snoozed" | "dismissed" | "completed" | "expired";
  escalationLevel: number;
  nextEscalationAt: string | null;
  scheduledFor: string;
  targetDate: string | null; // the event being counted down to
}

export interface QuietHours {
  startHour: number; // inclusive, local
  endHour: number; // exclusive, local
}

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Convert a rule delay to milliseconds, compressing hours→minutes in test mode. */
export function delayMs(delayHours: number, compressed: boolean): number {
  return compressed ? delayHours * MINUTE_MS : delayHours * HOUR_MS;
}

/**
 * When should a nudge first fire? lead_time_days before the target date.
 * In compressed mode, days become minutes so a full lifecycle runs in minutes.
 */
export function computeScheduledFor(
  targetDate: Date,
  leadTimeDays: number,
  compressed: boolean,
): Date {
  const lead = compressed ? leadTimeDays * MINUTE_MS : leadTimeDays * 24 * HOUR_MS;
  return new Date(targetDate.getTime() - lead);
}

/** Whole days from `now` until the target date (for "nog X dagen"). */
export function daysUntil(targetDate: Date, now: Date): number {
  return Math.ceil((targetDate.getTime() - now.getTime()) / (24 * HOUR_MS));
}

/** A scheduled nudge becomes active once its scheduled_for time has passed. */
export function shouldActivate(nudge: NudgeState, now: Date): boolean {
  return nudge.status === "scheduled" && new Date(nudge.scheduledFor).getTime() <= now.getTime();
}

/** A nudge expires when its target date has passed without completion. */
export function shouldExpire(nudge: NudgeState, now: Date): boolean {
  if (!nudge.targetDate) return false;
  const done = nudge.status === "completed" || nudge.status === "dismissed";
  if (done || nudge.status === "expired") return false;
  // Expire at end of the target day.
  const endOfDay = new Date(nudge.targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDay.getTime();
}

export interface EscalationDecision {
  shouldNotify: boolean;
  newLevel: number;
  tone: EscalationTone;
  nextEscalationAt: string | null;
}

/**
 * Decide whether an active nudge should escalate/re-notify right now.
 * Rules are sorted ascending by level. The delay on level N is the wait, while
 * sitting at level N-1, before moving up to N. At the top level we keep
 * re-notifying on that level's cadence (firm but capped elsewhere).
 */
export function evaluateEscalation(
  nudge: NudgeState,
  rules: EscalationRule[],
  now: Date,
  compressed: boolean,
): EscalationDecision {
  const sorted = [...rules].sort((a, b) => a.level - b.level);
  const maxLevel = sorted[sorted.length - 1]?.level ?? 0;

  const stay: EscalationDecision = {
    shouldNotify: false,
    newLevel: nudge.escalationLevel,
    tone: toneForLevel(sorted, nudge.escalationLevel),
    nextEscalationAt: nudge.nextEscalationAt,
  };

  if (nudge.status !== "active") return stay;

  // Not yet time to act.
  if (nudge.nextEscalationAt && new Date(nudge.nextEscalationAt).getTime() > now.getTime()) {
    return stay;
  }

  const nextLevel = Math.min(nudge.escalationLevel + 1, maxLevel);
  const atTop = nudge.escalationLevel >= maxLevel;
  const newLevel = atTop ? maxLevel : nextLevel;

  // Schedule the following transition using the delay of the level we'd move to
  // next (or, at the top, the top level's own cadence for repeat nudges).
  const followingRule =
    sorted.find((r) => r.level === Math.min(newLevel + 1, maxLevel)) ?? sorted[sorted.length - 1];
  const next = new Date(now.getTime() + delayMs(followingRule.delayHours, compressed));

  return {
    shouldNotify: true,
    newLevel,
    tone: toneForLevel(sorted, newLevel),
    nextEscalationAt: next.toISOString(),
  };
}

function toneForLevel(sorted: EscalationRule[], level: number): EscalationTone {
  return sorted.find((r) => r.level === level)?.tone ?? "gentle";
}

/** Is `now` (already in the user's local time) within quiet hours? */
export function isQuietHours(now: Date, quiet: QuietHours): boolean {
  const h = now.getHours();
  if (quiet.startHour === quiet.endHour) return false; // disabled
  if (quiet.startHour < quiet.endHour) {
    return h >= quiet.startHour && h < quiet.endHour;
  }
  // Wraps past midnight (e.g. 22 → 8).
  return h >= quiet.startHour || h < quiet.endHour;
}

/** Has the per-day notification cap been reached? */
export function capReached(sentToday: number, dailyCap: number): boolean {
  return sentToday >= dailyCap;
}

/** Apply the user's tone preference as a ceiling on rule tone. */
export function applyTonePreference(
  ruleTone: EscalationTone,
  preference: EscalationTone,
): EscalationTone {
  const rank: Record<EscalationTone, number> = { gentle: 0, nudge: 1, firm: 2 };
  return rank[ruleTone] <= rank[preference] ? ruleTone : preference;
}
