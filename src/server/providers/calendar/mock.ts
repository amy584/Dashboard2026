import type {
  CalendarEventInput,
  CalendarEventResult,
  CalendarProvider,
  FreeSlot,
} from "./types";

/** In-memory calendar for local dev/tests; idempotent by key. */
export class MockCalendarProvider implements CalendarProvider {
  private events = new Map<string, CalendarEventInput>();

  async findFreeSlots(opts: {
    from: string;
    to: string;
    durationMinutes: number;
  }): Promise<FreeSlot[]> {
    // Pretend evenings are free: return the requested window as one slot.
    return [{ start: opts.from, end: opts.to }];
  }

  async createEvent(
    input: CalendarEventInput,
    idempotencyKey: string,
  ): Promise<CalendarEventResult> {
    this.events.set(idempotencyKey, input);
    return { eventId: `mock_${idempotencyKey}` };
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events.delete(eventId.replace(/^mock_/, ""));
  }
}
