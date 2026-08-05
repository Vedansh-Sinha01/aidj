# Optizm Global — ATS + CRM

A combined Applicant Tracking System and Client Relationship Management tool for Optizm Global, a boutique IT/executive recruiting firm. Built to the [build spec] with real authentication, role-based access control, and a relatively small, deep data model (few clients, tracked closely) rather than high-volume staffing scale.

## Stack

- **Next.js 16** (App Router, TypeScript) — single full-stack app, server components for reads, API routes for mutations
- **PostgreSQL + Prisma** — data layer
- **NextAuth v5** (Credentials provider, JWT sessions) — email/password auth, RBAC enforced in middleware *and* in every API route
- **Tailwind CSS** — UI
- **Microsoft Graph (`@azure/msal-node`)** — per-user Outlook/Calendar integration (§8)
- **Anthropic API** — AI-assisted résumé field extraction (§7)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL at minimum
npx prisma migrate dev
npm run db:seed
npm run dev
```

Seed creates four demo users (password `password123` for all):

| Email | Role |
|---|---|
| `ceo@optizmglobal.com` | Manager / CEO |
| `manager@optizmglobal.com` | Manager / CEO |
| `alex@optizmglobal.com` | Recruiter |
| `jordan@optizmglobal.com` | Recruiter |

## Environment variables

See `.env.example`. Three groups:

1. **`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`** — required to run at all.
2. **`MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID`** — optional. Without these, Settings shows Outlook integration as unavailable; nothing else breaks. To enable: register an app in Azure AD (Azure Portal → App registrations), add redirect URI `{NEXTAUTH_URL}/api/integrations/microsoft/callback`, and grant delegated Graph permissions `Mail.Read`, `Mail.Send`, `Calendars.Read`, `User.Read`, `offline_access`.
3. **`ANTHROPIC_API_KEY`** — optional. Without it, résumé upload still extracts raw text and shows the review screen, but the auto-fill fields are blank (manual entry). With it, fields are pre-filled by Claude and still require recruiter review before saving (§7 — parsed data is never saved silently).

## What's built vs. stubbed

Everything in the spec is implemented end-to-end against the real data model. Two integrations need external credentials this environment doesn't have, per an explicit build-time decision: **build the full app, wire these two to real SDKs behind env vars, and let them go live once credentials are supplied**, rather than mocking their behavior.

- **Outlook/Microsoft Graph (§8)**: OAuth connect flow, token-cache-backed silent refresh, manual send, and mail/calendar sync are all implemented against the real Graph API. Untestable without a real Azure AD app registration — gracefully shows "not configured" in Settings until one is supplied.
- **AI résumé parsing (§7)**: Real PDF/.docx text extraction always runs. The AI structured-extraction step calls the Anthropic API and requires `ANTHROPIC_API_KEY`; without it, the review screen still appears with blank fields for manual entry (never silently skips the review step).

## Key build decisions

A few things the spec flagged as needing a decision during (or before) the build:

- **Guarantee window default**: 90 days (editable per placement).
- **Email-arrival ticket nudge**: pre-fills the client contact and the email subject line only; body is left for the user to fill in manually — avoids parsing email content into structured ticket fields.
- **Relationship Score sub-formulas (§4)**: implemented per the spec's suggested starting point — see `src/lib/relationship-score.ts` for the exact normalization logic and inline rationale for each of the 5 components. All are system-derived from `ActivityLog` (Outlook-synced or manually logged emails/meetings/calls) except Client Satisfaction, which is the one intentionally-manual input.
- **Real-time approval popup (§3)**: implemented as a 5-second client poll against `/api/approvals/pending`, rather than a websocket/push channel — there's no persistent connection infrastructure in this environment. Swap for Graph webhooks / a websocket server if true push is needed later.
- **Automation triggers (§9)**: there's no standing background worker in this environment. All 9 triggers (feedback overdue, stuck-in-stage, client-gone-quiet, invoice due/overdue, stale leads, untouched tickets, pending approvals) plus the two auto-generated ticket types run from `src/lib/automation.ts`, invoked opportunistically (throttled to once/minute per server process) whenever a user loads notifications. Wire `runAutomationSweep(true)` to a real cron (e.g. Vercel Cron hitting a `/api/cron/evaluate` route) in production for evaluation even when nobody has the app open.
- **Placement fee revenue / AR**: computed from `Invoice.amount` (no separate bill-rate/pay-rate calculation, per spec — the user enters the fee directly on the invoice).
- **Company Active/Dormant status**: computed on read from the formula in §5, not stored — always accurate, never goes stale.
- **Résumé storage**: local disk under `/storage` (gitignored, outside `/public`), served only through an authenticated API route since résumés are candidate PII. Swap for S3/Blob storage in a real deployment — `src/lib/storage.ts` is the only place that would need to change.

## Role-based access control

Two roles, enforced **both** in `src/middleware.ts` (so recruiters never see manager-only pages render) **and** in every API route via `requireUser()` / `requireUser("MANAGER")` in `src/lib/permissions.ts` (so hiding a button is never the only thing stopping an unauthorized request). Invoice/AR data and fee-editing are Manager/CEO-only; everything else is shared.

## Project structure

```
prisma/schema.prisma       full data model + inline §-references to the spec
prisma/seed.ts             demo users, companies, roles, candidates, a placement, invoice, leads, tickets
src/lib/                   business logic — KPIs, relationship score, automation rules, matching, résumé parsing, Graph client, duplicate detection
src/app/api/                REST API routes (mutations + anything needing server-only secrets)
src/app/(app)/               authenticated pages (server components reading Prisma directly)
src/components/            client components (forms, modals, polling widgets)
```
