-- ============================================================================
-- Attent — initial schema (§4)
-- All tables use UUID primary keys and created_at/updated_at timestamps.
-- Row Level Security is enabled in 0002_rls_policies.sql so a user can only
-- ever read/write his own rows.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Keeps updated_at fresh on any UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ──────────────────────────────────────────────────────────────────
create type fact_category    as enum ('flowers','food','drink','sizes','love_language','dislike','wishlist','misc');
create type fact_confidence  as enum ('manual','inferred');
create type fact_source      as enum ('onboarding','manual','reel','suggestion_feedback');

create type date_type        as enum ('birthday','anniversary','valentines','custom','recurring_gesture');

create type nudge_status     as enum ('scheduled','active','snoozed','dismissed','completed','expired');
create type escalation_tone  as enum ('gentle','nudge','firm');
create type notify_channel   as enum ('push','in_app');

create type suggestion_kind  as enum ('flowers','reservation','gift','message','experience');
create type suggestion_source as enum ('ai','reel','rules');
create type suggestion_status as enum ('offered','accepted','rejected','outsourced');

create type action_mode      as enum ('self_done','outsourced');
create type action_status    as enum ('drafted','confirmed','booked','sent','failed','completed');

create type inspiration_platform as enum ('instagram','manual','other');
create type inspiration_category as enum ('restaurant','flowers','travel','gift','other');
create type inspiration_added_by as enum ('user','partner_shared');

create type calendar_provider as enum ('google','apple');

create type payment_kind     as enum ('subscription','outsource_fee','gesture_cost');

-- ── users ────────────────────────────────────────────────────────────────--
create table public.users (
  id                  uuid primary key default gen_random_uuid(),
  auth_id             uuid not null unique references auth.users(id) on delete cascade,
  first_name          text,
  photo_url           text,
  locale              text not null default 'nl',
  timezone            text not null default 'Europe/Amsterdam',
  subscription_status text not null default 'free', -- free | active | past_due | canceled
  stripe_customer_id  text,
  -- Notification preferences (§6): quiet hours + per-day cap + tone preference.
  escalation_pref     escalation_tone not null default 'nudge',
  quiet_hours_start   smallint not null default 22, -- local hour, inclusive
  quiet_hours_end     smallint not null default 8,  -- local hour, exclusive
  daily_notification_cap smallint not null default 4,
  notifications_enabled  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── partners ──────────────────────────────────────────────────────────────
create table public.partners (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(id) on delete cascade,
  name                   text not null,
  pronoun                text,
  term_of_endearment     text,
  birthday               date,
  relationship_start_date date,
  photo_url              text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index partners_user_id_idx on public.partners(user_id);

-- ── partner_facts (the cheat sheet) ─────────────────────────────────────────
create table public.partner_facts (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners(id) on delete cascade,
  category    fact_category not null,
  key         text not null,
  value       text not null,
  confidence  fact_confidence not null default 'manual',
  source      fact_source not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index partner_facts_partner_id_idx on public.partner_facts(partner_id);
create index partner_facts_category_idx   on public.partner_facts(category);

-- ── important_dates ─────────────────────────────────────────────────────────
create table public.important_dates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  partner_id      uuid references public.partners(id) on delete cascade,
  type            date_type not null,
  title           text not null,
  date            date,                 -- nullable for pure recurring cadences
  recurrence_rule text,                 -- RRULE string, nullable
  lead_time_days  smallint not null default 7,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index important_dates_user_id_idx on public.important_dates(user_id);
create index important_dates_active_idx   on public.important_dates(is_active);

-- ── escalation_rules ────────────────────────────────────────────────────────
-- user_id NULL == global default seeded in 0003_seed.sql.
create table public.escalation_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  level       smallint not null,
  delay_hours numeric not null,         -- time since previous level before bumping
  tone        escalation_tone not null,
  channel     notify_channel not null default 'push',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index escalation_rules_user_id_idx on public.escalation_rules(user_id);

-- ── suggestions ──────────────────────────────────────────────────────────────
create table public.suggestions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  partner_id          uuid references public.partners(id) on delete cascade,
  nudge_id            uuid,             -- FK added after nudges exists
  kind                suggestion_kind not null,
  title               text not null,
  body                text,
  payload_json        jsonb not null default '{}'::jsonb,
  source              suggestion_source not null default 'ai',
  inspiration_item_id uuid,            -- FK added after inspiration_items exists
  why                 text,             -- honest, grounded reason string (§9)
  status              suggestion_status not null default 'offered',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index suggestions_user_id_idx on public.suggestions(user_id);

-- ── actions ───────────────────────────────────────────────────────────────--
create table public.actions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  suggestion_id     uuid references public.suggestions(id) on delete set null,
  nudge_id          uuid,              -- FK added after nudges exists
  kind              suggestion_kind not null,
  mode              action_mode not null,
  status            action_status not null default 'drafted',
  details_json      jsonb not null default '{}'::jsonb,
  calendar_event_id text,
  message_draft     text,
  cost_cents        integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index actions_user_id_idx on public.actions(user_id);

-- ── nudges ────────────────────────────────────────────────────────────────--
create table public.nudges (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  important_date_id    uuid references public.important_dates(id) on delete cascade,
  status               nudge_status not null default 'scheduled',
  scheduled_for        timestamptz not null,
  escalation_level     smallint not null default 0,
  last_notified_at     timestamptz,
  next_escalation_at   timestamptz,
  suggestion_id        uuid references public.suggestions(id) on delete set null,
  completed_action_id  uuid references public.actions(id) on delete set null,
  -- target_date is the event the nudge is counting down to (for "days left").
  target_date          date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index nudges_user_id_idx on public.nudges(user_id);
create index nudges_status_idx  on public.nudges(status);
create index nudges_next_escalation_idx on public.nudges(next_escalation_at);

-- Deferred FKs now that nudges exists.
alter table public.suggestions add constraint suggestions_nudge_id_fkey
  foreign key (nudge_id) references public.nudges(id) on delete set null;
alter table public.actions add constraint actions_nudge_id_fkey
  foreign key (nudge_id) references public.nudges(id) on delete set null;

-- ── inspiration_items ────────────────────────────────────────────────────────
create table public.inspiration_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  partner_id          uuid references public.partners(id) on delete cascade,
  source_url          text,
  platform            inspiration_platform not null default 'manual',
  media_thumbnail_url text,
  place_name          text,
  place_city          text,
  category            inspiration_category not null default 'other',
  caption_text        text,
  extracted_json      jsonb not null default '{}'::jsonb,
  added_by            inspiration_added_by not null default 'user',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index inspiration_items_user_id_idx on public.inspiration_items(user_id);

alter table public.suggestions add constraint suggestions_inspiration_item_id_fkey
  foreign key (inspiration_item_id) references public.inspiration_items(id) on delete set null;

-- ── calendar_connections ──────────────────────────────────────────────────--
-- Tokens are stored encrypted at rest (§12) — the app encrypts before insert.
create table public.calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  provider      calendar_provider not null,
  access_token  text not null,         -- encrypted
  refresh_token text,                   -- encrypted
  scope         text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);
create index calendar_connections_user_id_idx on public.calendar_connections(user_id);

-- ── push_subscriptions ────────────────────────────────────────────────────--
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- ── payments ──────────────────────────────────────────────────────────────--
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.users(id) on delete cascade,
  stripe_payment_intent_id text,
  kind                     payment_kind not null,
  amount_cents             integer not null,
  currency                 text not null default 'eur',
  status                   text not null,
  action_id                uuid references public.actions(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index payments_user_id_idx on public.payments(user_id);

-- ── audit_log ────────────────────────────────────────────────────────────--
-- Every notification, outsource confirm, calendar write, payment and AI call
-- is logged here (§12). Stores only metadata, never sensitive prompt content.
create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  event_type    text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_user_id_idx on public.audit_log(user_id);
create index audit_log_event_type_idx on public.audit_log(event_type);

-- ── updated_at triggers ──────────────────────────────────────────────────--
do $$
declare t text;
begin
  foreach t in array array[
    'users','partners','partner_facts','important_dates','escalation_rules',
    'suggestions','actions','nudges','inspiration_items','calendar_connections',
    'push_subscriptions','payments'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;
