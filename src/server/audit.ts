import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type AuditEvent =
  | "notification_sent"
  | "nudge_created"
  | "nudge_escalated"
  | "nudge_completed"
  | "outsource_confirmed"
  | "calendar_write"
  | "payment_charged"
  | "ai_call"
  | "reel_ingested"
  | "data_exported"
  | "account_deleted";

/**
 * Append an audit entry (§12). Store only metadata needed for accountability —
 * never raw AI prompt content or token values.
 */
export async function logAudit(
  client: SupabaseClient<Database>,
  userId: string,
  eventType: AuditEvent,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await client.from("audit_log").insert({
    user_id: userId,
    event_type: eventType,
    metadata_json: metadata,
  });
}
