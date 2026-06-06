# Security at Attentt

## Access control — Row Level Security everywhere

RLS is enabled on **every** table (`supabase/migrations/0002_rls_policies.sql`).
A user can only read/write rows they own:

- `users` policies key off `auth.uid()`.
- All other tables scope through `public.current_app_user_id()` (a `STABLE
  SECURITY DEFINER` function mapping the JWT to the app `users.id`).
- `partner_facts` is scoped transitively via its `partner → user` chain.
- `escalation_rules` lets users read global defaults (`user_id IS NULL`) but
  only write their own.
- `payments` and `audit_log` are read-only to the owner; writes happen only via
  the service-role client (Stripe webhooks, the nudge cron).

## Secrets & keys

- **No service-role key on the client.** The service-role Supabase client
  (`src/lib/supabase/admin.ts`) is server-only and used solely by trusted jobs
  that legitimately act across users (nudge cron, Stripe webhooks, hard-delete
  cascade).
- All third-party keys (Anthropic, Stripe, Google) are **server-side only**. AI
  calls go exclusively through server routes — the Anthropic key is never in the
  client bundle.
- Env access is centralised in `src/lib/env.ts`: `publicEnv` (NEXT_PUBLIC_ only)
  vs lazily-evaluated `serverEnv` getters that throw loudly if a secret is unset.

## Encryption at rest

Calendar OAuth tokens are encrypted with **AES-256-GCM** before they touch the
database (`src/server/crypto.ts`), keyed by `TOKEN_ENCRYPTION_KEY` (32 bytes,
base64). Decryption happens only server-side when a calendar call is made.

## Idempotency & rollback

Every external side effect is idempotent and logged:

- Calendar events use a deterministic idempotency key derived from the action id.
- Stripe charges pass an `idempotencyKey`.
- In the outsource flow, a failed charge **rolls back** the calendar event so a
  gesture is never half-committed.

## Webhooks

The Stripe webhook (`/api/stripe/webhook`) verifies the signature against
`STRIPE_WEBHOOK_SECRET` using the raw request body before acting.

## Cron protection

`/api/cron/evaluate` is rejected unless it presents `NUDGE_CRON_SECRET` (Bearer
header or `?secret=`), so the nudge engine can't be triggered by the public.

## Reporting

For a real deployment, add a security contact here and route reports to it.
Owner is a regulatory / data-protection consultant; this file is structured so a
formal review and DPIA can be slotted on top.
