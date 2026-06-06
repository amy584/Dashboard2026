-- ============================================================================
-- Attentt — Row Level Security (§4, §12)
-- A user may only ever read/write rows that belong to him. The service-role
-- key (used by cron/webhooks) bypasses RLS by design and is server-only.
-- ============================================================================

-- Maps the JWT's auth.uid() to our app users.id. STABLE so the planner can
-- cache it within a statement. SECURITY DEFINER to read the users table from
-- within policies without recursive RLS.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid();
$$;

-- Enable RLS on every table.
alter table public.users                enable row level security;
alter table public.partners             enable row level security;
alter table public.partner_facts        enable row level security;
alter table public.important_dates      enable row level security;
alter table public.escalation_rules     enable row level security;
alter table public.suggestions          enable row level security;
alter table public.actions              enable row level security;
alter table public.nudges               enable row level security;
alter table public.inspiration_items    enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.payments             enable row level security;
alter table public.audit_log            enable row level security;

-- ── users: keyed directly off auth.uid() ──
create policy users_select on public.users
  for select using (auth_id = auth.uid());
create policy users_insert on public.users
  for insert with check (auth_id = auth.uid());
create policy users_update on public.users
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());
create policy users_delete on public.users
  for delete using (auth_id = auth.uid());

-- ── Helper macro: tables owned via a user_id column ──
-- (Written out per-table for clarity and auditability.)

-- partners
create policy partners_all on public.partners
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- partner_facts: ownership via partner -> user
create policy partner_facts_all on public.partner_facts
  for all using (
    partner_id in (select id from public.partners where user_id = public.current_app_user_id())
  )
  with check (
    partner_id in (select id from public.partners where user_id = public.current_app_user_id())
  );

-- important_dates
create policy important_dates_all on public.important_dates
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- escalation_rules: a user sees global defaults (user_id IS NULL) + his own,
-- but may only write his own.
create policy escalation_rules_select on public.escalation_rules
  for select using (user_id is null or user_id = public.current_app_user_id());
create policy escalation_rules_insert on public.escalation_rules
  for insert with check (user_id = public.current_app_user_id());
create policy escalation_rules_update on public.escalation_rules
  for update using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy escalation_rules_delete on public.escalation_rules
  for delete using (user_id = public.current_app_user_id());

-- suggestions
create policy suggestions_all on public.suggestions
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- actions
create policy actions_all on public.actions
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- nudges
create policy nudges_all on public.nudges
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- inspiration_items
create policy inspiration_items_all on public.inspiration_items
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- calendar_connections
create policy calendar_connections_all on public.calendar_connections
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- push_subscriptions
create policy push_subscriptions_all on public.push_subscriptions
  for all using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- payments: readable by owner; writes happen via service role (webhooks).
create policy payments_select on public.payments
  for select using (user_id = public.current_app_user_id());

-- audit_log: readable by owner (for data export); writes via service role.
create policy audit_log_select on public.audit_log
  for select using (user_id = public.current_app_user_id());
