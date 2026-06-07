import { serverEnv } from "@/lib/env";
import type {
  CalendarEventInput,
  CalendarEventResult,
  CalendarProvider,
  FreeSlot,
} from "./types";

/**
 * Google Calendar provider. Uses an already-decrypted access token (the
 * connection layer in calendar/connection.ts handles encryption + refresh).
 * Calls go straight to the Calendar REST API to avoid a heavy SDK dependency.
 *
 * NOTE: token refresh is wired through `connection.ts`; this class assumes a
 * valid access token is passed in.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  constructor(private accessToken: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async findFreeSlots(opts: {
    from: string;
    to: string;
    durationMinutes: number;
  }): Promise<FreeSlot[]> {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        timeMin: opts.from,
        timeMax: opts.to,
        items: [{ id: "primary" }],
      }),
    });
    if (!res.ok) throw new Error(`Google freeBusy failed: ${res.status}`);
    const data = (await res.json()) as {
      calendars: { primary: { busy: { start: string; end: string }[] } };
    };
    return invertBusy(data.calendars.primary.busy, opts.from, opts.to, opts.durationMinutes);
  }

  async createEvent(
    input: CalendarEventInput,
    idempotencyKey: string,
  ): Promise<CalendarEventResult> {
    // Google supports per-request idempotency via a deterministic event id
    // (5-1024 chars, base32hex). Reuse the key so retries don't double-book.
    const eventId = idempotencyKey.replace(/[^a-v0-9]/g, "").slice(0, 64) || undefined;
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          id: eventId,
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.start },
          end: { dateTime: input.end },
        }),
      },
    );
    if (res.status === 409) {
      // Already created (idempotent retry) — treat as success.
      return { eventId: eventId ?? "" };
    }
    if (!res.ok) throw new Error(`Google createEvent failed: ${res.status}`);
    const data = (await res.json()) as { id: string; htmlLink?: string };
    return { eventId: data.id, htmlLink: data.htmlLink };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      throw new Error(`Google deleteEvent failed: ${res.status}`);
    }
  }
}

/** Build the Google OAuth consent URL (calendar scope). */
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: serverEnv.googleClientId,
    redirect_uri: serverEnv.googleRedirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.events openid email",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Turn busy blocks into bookable free slots of the requested duration. */
function invertBusy(
  busy: { start: string; end: string }[],
  from: string,
  to: string,
  durationMinutes: number,
): FreeSlot[] {
  const slots: FreeSlot[] = [];
  const durMs = durationMinutes * 60_000;
  let cursor = new Date(from).getTime();
  const end = new Date(to).getTime();
  const sorted = [...busy].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  for (const block of sorted) {
    const bStart = new Date(block.start).getTime();
    if (bStart - cursor >= durMs) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(bStart).toISOString() });
    }
    cursor = Math.max(cursor, new Date(block.end).getTime());
  }
  if (end - cursor >= durMs) {
    slots.push({ start: new Date(cursor).toISOString(), end: new Date(end).toISOString() });
  }
  return slots;
}
