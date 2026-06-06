-- ============================================================================
-- Attent — global escalation defaults (§4/§6) + auth bootstrap
-- ============================================================================

-- Global escalation ladder (user_id NULL). delay_hours is the wait since the
-- previous level before bumping. Higher levels are firmer and more frequent.
-- (Compressed-time test mode multiplies these down in app config, not here.)
insert into public.escalation_rules (user_id, level, delay_hours, tone, channel) values
  (null, 0, 0,  'gentle', 'push'),  -- first soft idea when the nudge activates
  (null, 1, 48, 'gentle', 'push'),  -- ~2 days later, still gentle
  (null, 2, 24, 'nudge',  'push'),  -- a day after that, a firmer nudge
  (null, 3, 12, 'firm',   'push');  -- final stretch: short, action-forcing

-- When a new auth user is created, mirror a row into public.users so the rest
-- of the app (and RLS via current_app_user_id) has an app-level identity.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_id, first_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'name')
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
