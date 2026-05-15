# Dental Recovery

Revenue recovery workspace for small and mid-sized dental clinics.

This repository implements the MVP plan as a production-shaped Next.js modular monolith:

- Missed Revenue Radar dashboard with new, unanswered, at-risk, lost, response time, conversion, and lost revenue metrics.
- Guided clinic setup, manager work queue, alert center, reporting, compliance export, and support health surfaces.
- Lead pipeline with assignment, status changes, booked/lost actions, and audit history.
- Inbox with conversations, human replies, auto replies, suggested replies, lead inspector, and lead timeline.
- Automation rules for first inbound, outside business hours, and SLA alerts.
- Integrations surface for live web forms, read-only clinic database sync, and staged messaging channels.
- AI insight layer with deterministic summary/risk outputs and usage limits.
- Billing screen backed by manual IBAN/SWIFT invoices today, with Stripe Checkout, Customer Portal, subscription webhooks, and plan limits kept as a future/live-card path.
- Super Admin view for organizations, integration health, subscriptions, and audit logs.
- Data Access Contract approval workflow so clinic IT can confirm tables, fields, PII categories, retention, and read-only mode before sync.
- Representative REST route handlers under `/api/v1`.
- OAuth/OIDC login handoff with PKCE, signed state cookie, email-to-membership mapping, and internal workspace session.
- Email/password auth for clinic owners plus self-serve clinic workspace registration.
- Prisma/PostgreSQL persistence when `DATABASE_URL` is configured, with file-backed fallback only for local development.
- Real mutation endpoints for lead status changes, messages, web form intake, automation toggles, AI summaries, integration health, Stripe billing, and SLA sweep.
- Prisma schema for the planned PostgreSQL data model.
- Production runbook for runtime alerts, replay safety, billing sync, data lifecycle, and incident response.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Key Files

- `src/app/dental-recovery-app.tsx` - interactive product shell.
- `src/domain/types.ts` - SaaS entities and API-facing types.
- `src/domain/business-rules.ts` - SLA, risk, lost revenue, AI summary, RBAC helpers.
- `src/domain/seed-data.ts` - demo organizations, users, leads, messages, billing, AI, audit logs.
- `src/app/api/v1/*` - representative API route handlers.
- `src/server/data-store.ts` - storage switch between Prisma/PostgreSQL and local file fallback.
- `src/server/prisma-store.ts` - AppState serialization to and from normalized Prisma models.
- `src/server/prisma.ts` - Prisma 7 client with PostgreSQL driver adapter.
- `src/server/state-mutations.ts` - server-side mutation functions shared by API routes.
- `prisma/schema.prisma` - PostgreSQL schema aligned to the MVP data model.
- `prisma.config.ts` - Prisma 7 datasource configuration.
- `docker-compose.yml` - local PostgreSQL for development.
- `docs/production-runbook.md` - deployment, smoke tests, and incident runbooks.

## PostgreSQL Setup

Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

Start Postgres, apply the schema, and seed the MVP data:

```bash
docker compose up -d postgres redis
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

When `DATABASE_URL` is present, `/api/v1/*` reads and writes through Prisma/PostgreSQL. Without `DATABASE_URL`, the same API routes fall back to `.data/dental-recovery-state.json` only in local development. In production runtime, the app refuses file-backed storage and fails fast if `DATABASE_URL` is missing, points at localhost, or Prisma cannot reach Postgres. `next build` is allowed to use file-backed data so CI/deploy builds do not require a live database connection.

Storage controls:

```bash
APP_STORAGE_DRIVER="auto" # auto | prisma | file
```

- `auto` uses Prisma when `DATABASE_URL` is configured, except during `next build`.
- `prisma` forces Postgres and is useful for CI smoke tests that intentionally validate DB access.
- `file` is local-only. It is rejected in production runtime.

Use `GET /api/v1/health/storage` after deploy to verify the runtime storage driver and Postgres reachability without exposing the database URL.

Set `SESSION_SECRET` to a long random value before deploying. It signs the
HTTP-only workspace session cookie used by the app and API routes.

Set `INTEGRATION_SECRET` before deploying multi-tenant clinic DB sync. It
encrypts each clinic's saved PostgreSQL connection string at rest.

Set `REDIS_URL` before production deploys. Webhook receipt processing and
outbound provider delivery use the BullMQ queue names shared with the Nest
worker runtime: `webhook.process` and `outbox.dispatch`. Local development can
fall back to inline processing when Redis is absent, but production route
handlers fail closed if queue processing cannot be configured.

## Clinic Authentication

The app now supports two production-safe login paths:

- Self-serve clinic registration with owner email/password. This creates a new
  organization, owner membership, starter trial subscription, usage limits, and
  a pending Clinic DB connector for that clinic only.
- OAuth/OIDC login for invited clinic users when your identity provider is
  configured.

## OAuth / OIDC Login

The platform supports a provider-neutral OAuth/OIDC authorization-code flow for
clinic SSO. Configure either `OAUTH_ISSUER_URL` for discovery or the explicit
`OAUTH_AUTHORIZATION_URL`, `OAUTH_TOKEN_URL`, and `OAUTH_USERINFO_URL` values.

Required production settings:

```bash
SESSION_SECRET="long-random-secret"
OAUTH_PROVIDER_LABEL="Google Workspace"
OAUTH_ISSUER_URL="https://accounts.google.com"
OAUTH_CLIENT_ID="..."
OAUTH_CLIENT_SECRET="..."
OAUTH_REDIRECT_URI="https://your-domain.com/api/v1/auth/oauth/callback"
OAUTH_ALLOWED_EMAIL_DOMAINS="clinic.com"
```

OAuth only proves identity. Authorization still comes from Dental Recovery
memberships: the provider email must match an active invited user, and that user
must have an active membership in the clinic organization. The app then issues
the same signed HTTP-only session cookie used by all API RBAC checks.

For preview or first-owner setup without a persistent database, you can
bootstrap exact Google emails into the target clinic organization:

```bash
OAUTH_BOOTSTRAP_EMAILS="owner@clinic.com"
OAUTH_BOOTSTRAP_ROLE="owner"
OAUTH_DEFAULT_ORGANIZATION_ID="org-smile-studio"
```

Bootstrapped users are deterministic and available on every app read, so OAuth
still works on ephemeral preview deployments.

For local testing, invite your Google account into the demo clinic:

```bash
npm run oauth:invite -- owner@clinic.example owner
```

The demo profile picker is disabled unless `ENABLE_DEV_LOGIN="true"` is set.
Production-shaped login should use OAuth or clinic email/password, not the dev profile picker.

## Billing

The product supports two billing modes:

- `manual` - owner requests an invoice, sees IBAN/SWIFT bank-transfer details,
  and platform support activates the plan after funds are confirmed.
- `stripe` - owner uses Stripe Checkout and Customer Portal when a supported
  legal entity and Stripe account are available.
- `hybrid` - keeps manual invoice controls visible while Stripe is also configured.

Manual bank-transfer settings:

```bash
BILLING_PROVIDER="manual"
MANUAL_BILLING_RECIPIENT_NAME="Your Company Name"
MANUAL_BILLING_RECIPIENT_ADDRESS="Company address"
MANUAL_BILLING_IBAN="UA..."
MANUAL_BILLING_SWIFT_BIC="..."
MANUAL_BILLING_BANK_NAME="..."
MANUAL_BILLING_BANK_ADDRESS="..."
MANUAL_BILLING_CORRESPONDENT_ACCOUNT="..."
MANUAL_BILLING_CORRESPONDENT_BANK="..."
MANUAL_BILLING_CORRESPONDENT_SWIFT_BIC="..."
MANUAL_BILLING_INTERMEDIARY_ACCOUNT="..."
MANUAL_BILLING_INTERMEDIARY_BANK="..."
MANUAL_BILLING_INTERMEDIARY_SWIFT_BIC="..."
MANUAL_BILLING_CURRENCY="USD"
MANUAL_BILLING_SUPPORT_EMAIL="support@dashdental.space"
MANUAL_BILLING_INVOICE_PREFIX="DR"
```

The owner flow uses `POST /api/v1/billing/manual-invoice`. It records an audit
row with the plan, amount, currency, and payment reference. After payment is
confirmed, a super admin can open `/platform/:organizationId` and activate the
paid plan for 30 days. This intentionally keeps bank transfer fulfillment as an
operator-confirmed step instead of trusting the customer-side click.

### Stripe Billing

Live subscription changes go through Stripe. The old direct plan mutation endpoint
is locked behind `ENABLE_DEV_BILLING="true"` and should stay disabled outside
local development.

Required billing settings:

```bash
APP_URL="https://your-domain.com"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_GROWTH="price_..."
STRIPE_PRICE_SCALE="price_..."
```

The UI creates Checkout Sessions with `POST /api/v1/billing/checkout-session`
and opens the Customer Portal with `POST /api/v1/billing/customer-portal`.
Stripe sends subscription state back through `POST /api/v1/webhooks/stripe`.

## Implemented API Examples

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/session`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/oauth/start`
- `GET /api/v1/auth/oauth/callback`
- `GET /api/v1/compliance/export`
- `GET /api/v1/leads`
- `POST /api/v1/leads`
- `GET /api/v1/conversations/:id/messages`
- `POST /api/v1/conversations/:id/messages`
- `POST /api/v1/webhooks/web-form`
- `POST /api/v1/ai/conversations/:id/summary`
- `GET /api/v1/billing/subscription`
- `POST /api/v1/billing/manual-invoice`
- `POST /api/v1/billing/checkout-session`
- `POST /api/v1/billing/customer-portal`
- `POST /api/v1/admin/billing/manual-activation`
- `POST /api/v1/webhooks/stripe`
- `GET /api/v1/automation-rules`
- `POST /api/v1/automation-rules`
- `GET /api/v1/state`
- `POST /api/v1/state` with `{ "action": "reset" }`
- `POST /api/v1/leads/:id/status`
- `POST /api/v1/demo/inbound` when `ENABLE_DEMO_ACTIONS="true"`
- `POST /api/v1/automation-rules/:id/toggle`
- `POST /api/v1/integrations/:id/status`
- `POST /api/v1/integrations/clinic-db/contract`
- `POST /api/v1/integrations/clinic-db/config`
- `POST /api/v1/integrations/clinic-db/sync`
- `POST /api/v1/billing/subscription/plan` when `ENABLE_DEV_BILLING="true"`
- `POST /api/v1/sla/sweep`

## Clinic Database Sync

Clinic database sync is implemented as a read-only connector gated by a Data Access
Contract. The sync endpoint will not read clinic tables until the contract is approved
by IT/admin through `POST /api/v1/integrations/clinic-db/contract`.

Each clinic can save its own read-only PostgreSQL connection string from the
dashboard under Integrations. The value is encrypted before being stored in the
platform database. Legacy single-tenant setups can still point a clinic
integration at `env:CLINIC_DATABASE_URL`.

Expose a canonical view named `dental_recovery_leads`.

Required view columns:

```sql
create view dental_recovery_leads as
select
  id::text as external_id,
  patient_name as name,
  phone,
  email,
  source,
  status,
  assigned_user_id as assigned_to,
  first_message_at,
  first_human_response_at,
  booked_at,
  lost_reason,
  estimated_value,
  updated_at,
  last_message_text
from your_clinic_leads_table;
```

The contract records purpose, approved tables, approved fields, PII categories,
retention period, approver, timestamp, and read-only mode. The SaaS reads this view
and writes only to its own Dental Recovery database. It never writes back to the clinic
database.

## MVP Integration Notes

The UI now loads and mutates state through local API routes. The primary persistence path is Prisma/PostgreSQL; the JSON file store remains only as a local fallback. The next production step is to add:

- Redis/BullMQ for webhook, SLA, AI, and retry jobs.
- Telegram Bot API and web form webhooks first.
- Instagram/WhatsApp after Meta approval and provider-specific testing.

## Business Rules Captured

- Auto replies do not count as human response.
- At-risk status starts after 15 minutes without human response.
- Unanswered starts after 5 minutes without human response.
- Lost revenue is based on no-response lost leads multiplied by average patient value.
- AI outputs are stored with model, prompt version, confidence, and estimated cost.
- Every cross-tenant entity includes an organization boundary in the schema.
