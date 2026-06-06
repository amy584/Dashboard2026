# Attentt

> **Zij onthoudt alles. Jij niet.**
> A mobile-first PWA that helps men remember and execute thoughtful gestures for
> their partner — it **remembers** the important dates, **suggests** grounded
> gestures, and **executes** them (draft + confirm) when you tap "outsource it".

Built per the build brief: Next.js 15 (App Router) + Supabase + Stripe + Web
Push + Anthropic, mobile-first, installable, Dutch-first.

---

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind |
| PWA | Web app manifest + service worker (offline shell + Web Push) |
| Backend / DB / Auth | Supabase (Postgres, Auth, RLS, Storage) |
| Notifications | Web Push (VAPID) behind a `NotificationSender` interface |
| Scheduling | Cron endpoint (`/api/cron/evaluate`) for nudge evaluation |
| Payments | Stripe (subscription + one-off) + Customer Portal + webhooks |
| Calendar | Google Calendar (OAuth) behind a `CalendarProvider` interface |
| AI | Anthropic API, **server-side only**, behind an `AIClient` interface |

Every external dependency sits behind an interface (`NotificationSender`,
`CalendarProvider`, `FulfilmentProvider`, `LinkParser`, `AIClient`,
`PaymentProvider`) with a real implementation **and** a mock, so the app runs
and tests pass without live credentials.

---

## Project layout

```
src/
  app/
    (auth)/            sign-in, sign-up
    (app)/             authenticated shell + tabs: Home, Dates, Her, Inspiration, Settings
                       + outsource/[nudgeId] flow
    onboarding/        6-step onboarding
    api/               push, cron, nudges, suggestions, inspiration, outsource,
                       stripe, calendar, account (export/delete)
    auth/callback/     OAuth code exchange
  components/          BottomNav, NudgeCard, AuthForm, ServiceWorkerRegister
  lib/                 env, i18n (nl), supabase clients, push helper
  server/
    nudges/            engine.ts (pure, tested) + copy.ts + evaluate.ts (cron orchestration)
    outsource/         service.ts (draft + confirm, tested)
    suggestions/       generate.ts (grounded suggestion engine)
    providers/         ai · calendar · fulfilment · link · notifications · payment
    crypto.ts          AES-256-GCM token encryption (calendar tokens at rest)
    audit.ts           audit_log helper
supabase/migrations/   0001 schema · 0002 RLS · 0003 seed + auth bootstrap
public/                manifest.webmanifest, sw.js, icons/
```

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the values (all documented in `.env.example`). The app **runs without
most secrets** — missing AI / calendar / VAPID keys fall back to mock or no-op
implementations — but you need at least the Supabase URL + anon key for auth and
data.

Generate the secrets you do need:

```bash
npm run gen:vapid                 # Web Push keypair → NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
openssl rand -base64 32           # → TOKEN_ENCRYPTION_KEY (must decode to 32 bytes)
```

PWA icons are checked in; regenerate with `node scripts/generate-icons.mjs`.

### 3. Database

Run the migrations in `supabase/migrations/` in order against your Supabase
project (SQL editor or `supabase db push`). They create every table, enable RLS,
add policies, seed the global escalation ladder, and install the auth → `users`
bootstrap trigger.

### 4. Run

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm test             # vitest (engine + outsource flow)
npm run build        # production build
```

---

## The nudge / escalation engine (§6)

- **Pure logic** lives in `src/server/nudges/engine.ts` (fully unit-tested):
  scheduling, activation, escalation, expiry, quiet-hours, daily cap, tone
  ceiling.
- **Orchestration** lives in `src/server/nudges/evaluate.ts` and is invoked by
  `POST /api/cron/evaluate` (protected by `NUDGE_CRON_SECRET`). Point a Supabase
  scheduled Edge Function or Vercel Cron at it every 15–30 min — see
  `vercel.json`. The endpoint accepts the secret either as a `Bearer` token in
  the `Authorization` header (set Vercel's `CRON_SECRET` equal to
  `NUDGE_CRON_SECRET`) or as a `?secret=` query param for manual/local calls.
- **Copy** is an editable table keyed by `(kind, level, tone)` in
  `src/server/nudges/copy.ts`, never hardcoded in the engine.

### Compressed-time test mode

Set `NUDGE_COMPRESSED_TIME=true` to turn day-based timings into minutes so a full
nudge lifecycle (schedule → activate → escalate L0→L3 → expire) plays out in
minutes instead of days. Then hit the cron endpoint repeatedly:

```bash
curl "http://localhost:3000/api/cron/evaluate?secret=$NUDGE_CRON_SECRET"
```

---

## The outsource flow (§7)

`src/server/outsource/service.ts` is two explicit phases, both tested:

1. `assembleDraft` — **no side effects**: finds a calendar slot (or uses a manual
   time), builds the gesture draft via `FulfilmentProvider`, drafts the partner
   message via `AIClient`.
2. `executeConfirmed` — runs **only after the user confirms**: writes the
   calendar event (idempotent), charges via Stripe if there's a cost, and **rolls
   the calendar event back if the charge fails**. Nothing is booked, charged, or
   sent before confirm.

---

## Deploy

- **Frontend → Vercel.** Set all env vars. `vercel.json` registers the nudge cron.
- **Backend → Supabase.** Run migrations; set the Stripe webhook to
  `/api/stripe/webhook`; set Google OAuth redirect to
  `/api/calendar/google/callback`.
- Configure the Stripe Customer Portal and a subscription Price; put its id in
  `STRIPE_SUBSCRIPTION_PRICE_ID`.

See `PRIVACY.md` and `SECURITY.md` for the data-protection posture (RLS,
encryption, export/delete, audit logging, consent).
