# Attent — testen & uitrollen (zonder app store)

Attent is een **PWA** (installeerbare web-app). Je hebt **geen** App Store, Play
Store of TestFlight nodig. Je host de app één keer, deelt de link, en testers
kiezen op hun telefoon **"Zet op beginscherm"** — daarna opent het als een app.

Aanbevolen stack: **Vercel** (frontend, gratis) + **Supabase** (database/auth,
gratis tier). Eenmalige setup: ~30–45 min.

---

## Stap 1 — Supabase project (database + login)

1. Maak een project op supabase.com.
2. Open **SQL Editor** en draai de migraties **in deze volgorde** (kopieer de
   inhoud van elk bestand en run):
   1. `supabase/migrations/0001_init_schema.sql`
   2. `supabase/migrations/0002_rls_policies.sql`
   3. `supabase/migrations/0003_seed_and_auth.sql`
   (Of, met de Supabase CLI: `supabase db push`.)
3. **Authentication → Providers → Email**: zet "Confirm email" uit voor snel
   testen, óf laat aan en testers bevestigen via e-mail.
4. **Project Settings → API**: noteer `Project URL`, `anon` key en
   `service_role` key (die heb je in stap 3 nodig).

## Stap 2 — Deploy naar Vercel

1. Push is al gebeurd; importeer de repo `amy584/dashboard2026` op vercel.com
   (New Project → Import). Framework = Next.js (autodetect).
2. Zet onder **Environment Variables** minimaal:

   | Variabele | Waarde |
   | --- | --- |
   | `NEXT_PUBLIC_APP_URL` | je Vercel-URL (bijv. `https://attent.vercel.app`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
   | `NUDGE_CRON_SECRET` | een willekeurige string |

   Voor **push-meldingen** (aanbevolen voor een echte test) ook:

   | Variabele | Waarde |
   | --- | --- |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | uit `npm run gen:vapid` |
   | `VAPID_PRIVATE_KEY` | uit `npm run gen:vapid` |
   | `VAPID_SUBJECT` | `mailto:jij@voorbeeld.nl` |

   Optioneel (anders vallen die features terug op mock/uit):
   `ANTHROPIC_API_KEY` (AI-suggesties; zonder = nette mock),
   `STRIPE_*` (abonnement/betaling), `GOOGLE_*` (agenda).

3. Deploy. Open daarna `NEXT_PUBLIC_APP_URL` op je telefoon.

### De nudge-cron aanzetten (meldingen op tijd)
`vercel.json` bevat al een cron die elke 15 min `/api/cron/evaluate` aanroept.
Zet in Vercel een env var **`CRON_SECRET`** gelijk aan je `NUDGE_CRON_SECRET`,
zodat Vercel de beveiligde endpoint mag aanroepen.

## Stap 3 — Installeren op de telefoon (jij + testers)

- **iPhone (Safari):** deel-icoon → **"Zet op beginscherm"**.
- **Android (Chrome):** menu → **"App installeren"** / "Toevoegen aan
  startscherm".

De app draait dan fullscreen, met het Attent-icoon op het beginscherm.

---

## Een testgroep laten meedoen (snelste manier)

1. Deel simpelweg de **Vercel-URL** (WhatsApp/mail) met je testers.
2. Voeg een korte instructie toe: *"Open de link in Safari/Chrome → Zet op
   beginscherm → maak een account."*
3. Iedereen maakt zelf een account aan (Supabase auth). Wil je het besloten
   houden? Zet in Supabase **Authentication → open signups uit** en nodig
   testers handmatig uit, of houd de URL gewoon privé binnen de groep.

### Belangrijk voor testers (eerlijk verwachtingsmanagement)
- **Push-meldingen op iPhone** werken alleen bij **iOS 16.4+** én **nadat de app
  op het beginscherm is gezet** (Apple-vereiste). Anders: in-app herinneringen.
- Zonder `ANTHROPIC_API_KEY` zijn de AI-suggesties een **nette mock** (vaste
  voorbeelden) — prima om de flow te testen.
- Zonder Stripe-/Google-keys zijn **abonnement** en **agenda koppelen** nog niet
  functioneel; laat testers die knoppen overslaan, of zet test-keys.

### Feedback verzamelen
Het simpelst: een gedeeld formulier (Google Forms/Notion) of een
WhatsApp-groep. (Een in-app feedbackknop kan ik later toevoegen.)

---

## Even snel zelf bekijken (zonder deploy)
Lokaal op je eigen machine: vul `.env.local` (zie `.env.example`), dan
`npm run dev` → `http://localhost:3000`. Alleen op je eigen netwerk te zien.
