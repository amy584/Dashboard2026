/**
 * Hand-maintained types mirroring supabase/migrations/*.sql.
 * Keep in sync with the schema (or replace with `supabase gen types`).
 */

export type FactCategory =
  | "flowers" | "food" | "drink" | "sizes" | "love_language" | "dislike" | "wishlist" | "misc";
export type FactConfidence = "manual" | "inferred";
export type FactSource = "onboarding" | "manual" | "reel" | "suggestion_feedback";
export type DateType = "birthday" | "anniversary" | "valentines" | "custom" | "recurring_gesture";
export type NudgeStatus = "scheduled" | "active" | "snoozed" | "dismissed" | "completed" | "expired";
export type EscalationTone = "gentle" | "nudge" | "firm";
export type NotifyChannel = "push" | "in_app";
export type SuggestionKind = "flowers" | "reservation" | "gift" | "message" | "experience";
export type SuggestionSource = "ai" | "reel" | "rules";
export type SuggestionStatus = "offered" | "accepted" | "rejected" | "outsourced";
export type ActionMode = "self_done" | "outsourced";
export type ActionStatus = "drafted" | "confirmed" | "booked" | "sent" | "failed" | "completed";
export type InspirationPlatform = "instagram" | "manual" | "other";
export type InspirationCategory = "restaurant" | "flowers" | "travel" | "gift" | "other";
export type InspirationAddedBy = "user" | "partner_shared";
export type CalendarProvider = "google" | "apple";
export type PaymentKind = "subscription" | "outsource_fee" | "gesture_cost";

type Timestamps = { created_at: string; updated_at: string };

// NOTE: these are `type` aliases (not `interface`s) on purpose — only object
// type aliases satisfy `Record<string, unknown>`, which the Supabase client's
// `GenericTable` constraint requires. Interfaces would make the schema resolve
// to `never` and break every query's typing.
export type UserRow = Timestamps & {
  id: string;
  auth_id: string;
  first_name: string | null;
  photo_url: string | null;
  locale: string;
  timezone: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  escalation_pref: EscalationTone;
  quiet_hours_start: number;
  quiet_hours_end: number;
  daily_notification_cap: number;
  notifications_enabled: boolean;
};

export type PartnerRow = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  pronoun: string | null;
  term_of_endearment: string | null;
  birthday: string | null;
  relationship_start_date: string | null;
  photo_url: string | null;
};

export type PartnerFactRow = Timestamps & {
  id: string;
  partner_id: string;
  category: FactCategory;
  key: string;
  value: string;
  confidence: FactConfidence;
  source: FactSource;
};

export type ImportantDateRow = Timestamps & {
  id: string;
  user_id: string;
  partner_id: string | null;
  type: DateType;
  title: string;
  date: string | null;
  recurrence_rule: string | null;
  lead_time_days: number;
  is_active: boolean;
};

export type EscalationRuleRow = Timestamps & {
  id: string;
  user_id: string | null;
  level: number;
  delay_hours: number;
  tone: EscalationTone;
  channel: NotifyChannel;
};

export type SuggestionRow = Timestamps & {
  id: string;
  user_id: string;
  partner_id: string | null;
  nudge_id: string | null;
  kind: SuggestionKind;
  title: string;
  body: string | null;
  payload_json: Record<string, unknown>;
  source: SuggestionSource;
  inspiration_item_id: string | null;
  why: string | null;
  status: SuggestionStatus;
};

export type ActionRow = Timestamps & {
  id: string;
  user_id: string;
  suggestion_id: string | null;
  nudge_id: string | null;
  kind: SuggestionKind;
  mode: ActionMode;
  status: ActionStatus;
  details_json: Record<string, unknown>;
  calendar_event_id: string | null;
  message_draft: string | null;
  cost_cents: number | null;
  completed_at: string | null;
};

export type NudgeRow = Timestamps & {
  id: string;
  user_id: string;
  important_date_id: string | null;
  status: NudgeStatus;
  scheduled_for: string;
  escalation_level: number;
  last_notified_at: string | null;
  next_escalation_at: string | null;
  suggestion_id: string | null;
  completed_action_id: string | null;
  target_date: string | null;
};

export type InspirationItemRow = Timestamps & {
  id: string;
  user_id: string;
  partner_id: string | null;
  source_url: string | null;
  platform: InspirationPlatform;
  media_thumbnail_url: string | null;
  place_name: string | null;
  place_city: string | null;
  category: InspirationCategory;
  caption_text: string | null;
  extracted_json: Record<string, unknown>;
  added_by: InspirationAddedBy;
};

export type CalendarConnectionRow = Timestamps & {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  expires_at: string | null;
};

export type PushSubscriptionRow = Timestamps & {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

export type PaymentRow = Timestamps & {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  kind: PaymentKind;
  amount_cents: number;
  currency: string;
  status: string;
  action_id: string | null;
};

export type AuditLogRow = {
  id: string;
  user_id: string;
  event_type: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

// Keys whose type admits null — optional on insert (DB stores null / a default).
type NullableKeys<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T];
// Server-managed columns are always optional on insert.
type ManagedKeys = "id" | "created_at" | "updated_at";
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Generic table shape for the Supabase generic client. */
type Table<Row> = {
  Row: Row;
  Insert: MakeOptional<Row, (NullableKeys<Row> | ManagedKeys) & keyof Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      users: Table<UserRow>;
      partners: Table<PartnerRow>;
      partner_facts: Table<PartnerFactRow>;
      important_dates: Table<ImportantDateRow>;
      escalation_rules: Table<EscalationRuleRow>;
      suggestions: Table<SuggestionRow>;
      actions: Table<ActionRow>;
      nudges: Table<NudgeRow>;
      inspiration_items: Table<InspirationItemRow>;
      calendar_connections: Table<CalendarConnectionRow>;
      push_subscriptions: Table<PushSubscriptionRow>;
      payments: Table<PaymentRow>;
      audit_log: Omit<Table<AuditLogRow>, "Update"> & { Update: Partial<AuditLogRow> };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_user_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      fact_category: FactCategory;
      escalation_tone: EscalationTone;
    };
    CompositeTypes: Record<string, never>;
  };
}
