-- ============================================================================
-- Attent — addresses for concierge-prep outsourcing (Fase 3)
-- The user's own address/phone (sender) and the partner's delivery address.
-- Used to pre-assemble flower orders / reservations; never shared externally
-- without the user's explicit confirm.
-- ============================================================================

alter table public.users
  add column if not exists address_line text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists phone text;

alter table public.partners
  add column if not exists address_line text,
  add column if not exists postal_code text,
  add column if not exists city text;
