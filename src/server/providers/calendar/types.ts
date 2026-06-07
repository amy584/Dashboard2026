/**
 * CalendarProvider interface (§7/§14). Google first; structured so Apple
 * (CalDAV/EventKit) can be added behind the same interface later.
 */

export interface FreeSlot {
  start: string; // ISO
  end: string; // ISO
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  location?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink?: string;
}

export interface CalendarProvider {
  /** Find free slots near a target date (e.g. Friday evening). */
  findFreeSlots(opts: { from: string; to: string; durationMinutes: number }): Promise<FreeSlot[]>;
  /** Idempotent create: same idempotencyKey must not double-book (§7). */
  createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEventResult>;
  deleteEvent(eventId: string): Promise<void>;
}
