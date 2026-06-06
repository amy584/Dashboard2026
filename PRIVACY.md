# Privacy at Attent

Attent holds sensitive personal data — relationship details, notes about a
**third party** (the partner, who is not the account holder), and calendar
access. We build privacy-by-design. This document summarises the posture so a
DPIA can be layered on top.

## What we store and why

| Data | Purpose | Notes |
| --- | --- | --- |
| Account (email, name, locale, timezone) | Auth, personalisation | Via Supabase Auth |
| Partner profile + facts ("cheat sheet") | Reminders & grounded suggestions | The user's **own notes** about their partner; fully editable/deletable |
| Important dates | Reminders & nudges | — |
| Nudges, suggestions, actions | Run the reminder/gesture engine | — |
| Inspiration items | Learn taste from shared links | **Public metadata only** (see below) |
| Calendar tokens | Find a free slot when outsourcing | **Encrypted at rest** (AES-256-GCM) |
| Push subscriptions | Deliver reminders | Cleaned up when expired/invalid |
| Payments | Billing & gesture costs | Card data never touches us — Stripe only |
| Audit log | Accountability | Metadata only; never raw AI prompts or tokens |

**Data minimisation:** we store only what a feature needs. Partner data is
framed throughout the UI as the user's own notes.

## The partner is a third party

The partner does not have an account. Their data is the account holder's
personal notes. We make this framing explicit in onboarding and Settings, and we
provide one-tap edit/delete for every fact.

## Transparency & control

- **Consent is explicit and separate** for notifications and calendar access,
  each requested with a plain-language reason, each declinable ("later") and
  revocable in Settings.
- **Export my data** — `Settings → Exporteer mijn data` downloads a complete
  JSON export (`GET /api/account/export`).
- **Delete my account + all data** — `Settings → Verwijder account` performs a
  hard delete that cascades to every owned row (`POST /api/account/delete`).

## Reel / link intake

The Inspiration feature uses **only publicly available metadata** (Open
Graph / oEmbed-style) plus manual entry. It does **not** log in to, scrape
authenticated feeds of, or bypass authentication on any platform. This is
documented in code (`src/server/providers/link/`) and enforced by the design of
the `LinkParser` interface. If public metadata is thin, the user fills the
fields in manually.

## No autonomous side effects

Nothing is booked, charged, or sent without an explicit user confirm. The
outsource flow is strictly **draft → confirm → execute**, and Attent never
messages the partner directly (the user sends via their own channels).

## Audit logging

Every notification sent, outsource confirmation, calendar write, payment, and AI
call is recorded in `audit_log` with metadata only — never sensitive prompt
content or token values.
