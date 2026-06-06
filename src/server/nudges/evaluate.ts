import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EscalationTone, SuggestionKind } from "@/lib/supabase/types";
import { compressedTimeMode } from "@/lib/env";
import { logAudit } from "@/server/audit";
import { getNotificationSender } from "@/server/providers/notifications/webpush";
import {
  applyTonePreference,
  capReached,
  computeScheduledFor,
  daysUntil,
  evaluateEscalation,
  isQuietHours,
  shouldActivate,
  shouldExpire,
  type EscalationRule,
  type NudgeState,
} from "./engine";
import { notificationCopy } from "./copy";

type DB = SupabaseClient<Database>;

export interface EvaluateSummary {
  created: number;
  activated: number;
  notified: number;
  expired: number;
}

/**
 * Full nudge-engine pass (§6). Designed to run from a scheduled Edge Function
 * every 15–30 min via the admin client (bypasses RLS to scan all users).
 * Pure timing decisions are delegated to ./engine; this layer is the I/O.
 */
export async function evaluateNudges(admin: DB, now = new Date()): Promise<EvaluateSummary> {
  const summary: EvaluateSummary = { created: 0, activated: 0, notified: 0, expired: 0 };

  // Global escalation defaults (user-level overrides could extend this).
  const { data: rulesData } = await admin
    .from("escalation_rules")
    .select("level, delay_hours, tone")
    .is("user_id", null)
    .order("level");
  const rules: EscalationRule[] = (rulesData ?? []).map((r) => ({
    level: r.level,
    delayHours: Number(r.delay_hours),
    tone: r.tone,
  }));

  summary.created = await createDueNudges(admin, now);

  // Work through open nudges.
  const { data: nudges } = await admin
    .from("nudges")
    .select("*, users!inner(*), important_dates(title, type), suggestions(kind)")
    .in("status", ["scheduled", "active", "snoozed"]);

  const sender = getNotificationSender();

  for (const n of nudges ?? []) {
    const user = (n as unknown as { users: Database["public"]["Tables"]["users"]["Row"] }).users;
    const state: NudgeState = {
      status: n.status,
      escalationLevel: n.escalation_level,
      nextEscalationAt: n.next_escalation_at,
      scheduledFor: n.scheduled_for,
      targetDate: n.target_date,
    };

    // Expire stale nudges.
    if (shouldExpire(state, now)) {
      await admin.from("nudges").update({ status: "expired" }).eq("id", n.id);
      await logAudit(admin, user.id, "nudge_completed", { nudgeId: n.id, status: "expired" });
      summary.expired += 1;
      continue;
    }

    // Activate scheduled nudges that have come due.
    if (shouldActivate(state, now)) {
      await admin
        .from("nudges")
        .update({ status: "active", next_escalation_at: now.toISOString() })
        .eq("id", n.id);
      state.status = "active";
      state.nextEscalationAt = now.toISOString();
      summary.activated += 1;
    }

    if (state.status !== "active") continue;

    const decision = evaluateEscalation(state, rules, now, compressedTimeMode);
    if (!decision.shouldNotify) continue;

    // Respect quiet hours + daily cap + tone preference before sending.
    const localNow = toUserLocal(now, user.timezone);
    if (isQuietHours(localNow, { startHour: user.quiet_hours_start, endHour: user.quiet_hours_end })) {
      continue;
    }
    const sentToday = await countNotificationsToday(admin, user.id, now);
    if (capReached(sentToday, user.daily_notification_cap)) continue;

    const tone: EscalationTone = applyTonePreference(decision.tone, user.escalation_pref);
    const kind: SuggestionKind =
      (n as unknown as { suggestions?: { kind: SuggestionKind } }).suggestions?.kind ?? "message";
    const title =
      (n as unknown as { important_dates?: { title: string } }).important_dates?.title ?? "Attentt";
    const days = n.target_date ? daysUntil(new Date(n.target_date), now) : 0;

    const copy = notificationCopy(kind, decision.newLevel, tone, { name: title, days });

    // Persist the escalation transition first (so a send failure doesn't loop).
    await admin
      .from("nudges")
      .update({
        escalation_level: decision.newLevel,
        next_escalation_at: decision.nextEscalationAt,
        last_notified_at: now.toISOString(),
      })
      .eq("id", n.id);

    // Deliver to all of the user's push targets; clean up expired ones.
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);
    if (user.notifications_enabled && subs && subs.length) {
      const results = await sender.sendMany(
        subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
        { title: copy.title, body: copy.body, url: "/", nudgeId: n.id, tag: `nudge-${n.id}` },
      );
      for (const r of results) {
        if (r.expired) {
          await admin.from("push_subscriptions").delete().eq("endpoint", r.target.endpoint);
        }
      }
      await logAudit(admin, user.id, "notification_sent", {
        nudgeId: n.id,
        level: decision.newLevel,
        tone,
      });
      summary.notified += 1;
    }
  }

  return summary;
}

/** Create scheduled nudges for active dates entering their lead window. */
async function createDueNudges(admin: DB, now: Date): Promise<number> {
  const { data: dates } = await admin
    .from("important_dates")
    .select("*")
    .eq("is_active", true)
    .not("date", "is", null);

  let created = 0;
  for (const d of dates ?? []) {
    const target = nextOccurrence(d.date!, d.recurrence_rule, now);
    if (!target) continue;
    const scheduledFor = computeScheduledFor(target, d.lead_time_days, compressedTimeMode);
    if (scheduledFor.getTime() > now.getTime()) continue; // not in lead window yet

    // Don't duplicate: skip if an open nudge already targets this date.
    const { data: existing } = await admin
      .from("nudges")
      .select("id")
      .eq("important_date_id", d.id)
      .in("status", ["scheduled", "active", "snoozed"])
      .maybeSingle();
    if (existing) continue;

    await admin.from("nudges").insert({
      user_id: d.user_id,
      important_date_id: d.id,
      status: "scheduled",
      scheduled_for: scheduledFor.toISOString(),
      target_date: target.toISOString().slice(0, 10),
      escalation_level: 0,
    });
    await logAudit(admin, d.user_id, "nudge_created", { importantDateId: d.id });
    created += 1;
  }
  return created;
}

/** Resolve the next occurrence of a date, honouring a simple YEARLY recurrence. */
function nextOccurrence(date: string, rrule: string | null, now: Date): Date | null {
  const base = new Date(date + "T09:00:00");
  if (!rrule || !/FREQ=YEARLY/i.test(rrule)) {
    return base.getTime() >= now.getTime() ? base : base; // one-off: keep for expiry handling
  }
  const next = new Date(base);
  next.setFullYear(now.getFullYear());
  if (next.getTime() < now.getTime() - 24 * 3_600_000) next.setFullYear(now.getFullYear() + 1);
  return next;
}

/** Count notifications already sent today for the daily cap. */
async function countNotificationsToday(admin: DB, userId: string, now: Date): Promise<number> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "notification_sent")
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

/** Convert an instant to the user's local wall-clock (for quiet-hours checks). */
function toUserLocal(now: Date, timezone: string): Date {
  try {
    const s = now.toLocaleString("en-US", { timeZone: timezone });
    return new Date(s);
  } catch {
    return now;
  }
}
