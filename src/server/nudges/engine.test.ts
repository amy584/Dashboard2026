import { describe, it, expect } from "vitest";
import {
  applyTonePreference,
  capReached,
  computeScheduledFor,
  daysUntil,
  delayMs,
  evaluateEscalation,
  isQuietHours,
  shouldActivate,
  shouldExpire,
  type EscalationRule,
  type NudgeState,
} from "./engine";

const RULES: EscalationRule[] = [
  { level: 0, delayHours: 0, tone: "gentle" },
  { level: 1, delayHours: 48, tone: "gentle" },
  { level: 2, delayHours: 24, tone: "nudge" },
  { level: 3, delayHours: 12, tone: "firm" },
];

describe("delayMs", () => {
  it("uses hours normally and minutes when compressed", () => {
    expect(delayMs(48, false)).toBe(48 * 3_600_000);
    expect(delayMs(48, true)).toBe(48 * 60_000);
  });
});

describe("computeScheduledFor", () => {
  it("schedules lead_time_days before the target", () => {
    const target = new Date("2026-02-14T00:00:00Z");
    const at = computeScheduledFor(target, 7, false);
    expect(at.toISOString()).toBe("2026-02-07T00:00:00.000Z");
  });
  it("compresses days to minutes in test mode", () => {
    const target = new Date("2026-02-14T00:10:00Z");
    const at = computeScheduledFor(target, 7, true);
    expect(at.toISOString()).toBe("2026-02-14T00:03:00.000Z");
  });
});

describe("daysUntil", () => {
  it("counts whole days up, inclusive of partial days", () => {
    expect(daysUntil(new Date("2026-02-14T00:00:00Z"), new Date("2026-02-13T01:00:00Z"))).toBe(1);
    expect(daysUntil(new Date("2026-02-14T00:00:00Z"), new Date("2026-02-11T00:00:00Z"))).toBe(3);
  });
});

describe("shouldActivate / shouldExpire", () => {
  const base: NudgeState = {
    status: "scheduled",
    escalationLevel: 0,
    nextEscalationAt: null,
    scheduledFor: "2026-02-07T00:00:00Z",
    targetDate: "2026-02-14",
  };
  it("activates once scheduled_for has passed", () => {
    expect(shouldActivate(base, new Date("2026-02-07T01:00:00Z"))).toBe(true);
    expect(shouldActivate(base, new Date("2026-02-06T00:00:00Z"))).toBe(false);
  });
  it("expires after the target day ends", () => {
    const active = { ...base, status: "active" as const };
    expect(shouldExpire(active, new Date("2026-02-15T00:00:00Z"))).toBe(true);
    expect(shouldExpire(active, new Date("2026-02-14T12:00:00Z"))).toBe(false);
  });
  it("does not expire completed/dismissed nudges", () => {
    expect(shouldExpire({ ...base, status: "completed" }, new Date("2026-03-01T00:00:00Z"))).toBe(
      false,
    );
  });
});

describe("evaluateEscalation", () => {
  const active: NudgeState = {
    status: "active",
    escalationLevel: 0,
    nextEscalationAt: "2026-02-09T00:00:00Z",
    scheduledFor: "2026-02-07T00:00:00Z",
    targetDate: "2026-02-14",
  };

  it("does nothing before next_escalation_at", () => {
    const d = evaluateEscalation(active, RULES, new Date("2026-02-08T00:00:00Z"), false);
    expect(d.shouldNotify).toBe(false);
    expect(d.newLevel).toBe(0);
  });

  it("bumps level and notifies once due", () => {
    const d = evaluateEscalation(active, RULES, new Date("2026-02-09T00:01:00Z"), false);
    expect(d.shouldNotify).toBe(true);
    expect(d.newLevel).toBe(1);
    expect(d.tone).toBe("gentle");
    // Next transition scheduled using level 2's delay (24h).
    expect(d.nextEscalationAt).toBe("2026-02-10T00:01:00.000Z");
  });

  it("caps at the top level but keeps re-notifying", () => {
    const top: NudgeState = { ...active, escalationLevel: 3, nextEscalationAt: "2026-02-13T00:00:00Z" };
    const d = evaluateEscalation(top, RULES, new Date("2026-02-13T01:00:00Z"), false);
    expect(d.shouldNotify).toBe(true);
    expect(d.newLevel).toBe(3);
    expect(d.tone).toBe("firm");
  });

  it("never escalates a non-active nudge", () => {
    const d = evaluateEscalation(
      { ...active, status: "snoozed" },
      RULES,
      new Date("2026-03-01T00:00:00Z"),
      false,
    );
    expect(d.shouldNotify).toBe(false);
  });
});

describe("quiet hours", () => {
  const quiet = { startHour: 22, endHour: 8 };
  it("respects wrap-around windows", () => {
    expect(isQuietHours(new Date("2026-02-09T23:00:00"), quiet)).toBe(true);
    expect(isQuietHours(new Date("2026-02-09T07:00:00"), quiet)).toBe(true);
    expect(isQuietHours(new Date("2026-02-09T12:00:00"), quiet)).toBe(false);
  });
  it("treats start==end as disabled", () => {
    expect(isQuietHours(new Date("2026-02-09T23:00:00"), { startHour: 0, endHour: 0 })).toBe(false);
  });
});

describe("caps and tone preference", () => {
  it("enforces daily cap", () => {
    expect(capReached(4, 4)).toBe(true);
    expect(capReached(2, 4)).toBe(false);
  });
  it("clamps rule tone to the user preference ceiling", () => {
    expect(applyTonePreference("firm", "gentle")).toBe("gentle");
    expect(applyTonePreference("gentle", "firm")).toBe("gentle");
    expect(applyTonePreference("nudge", "firm")).toBe("nudge");
  });
});
