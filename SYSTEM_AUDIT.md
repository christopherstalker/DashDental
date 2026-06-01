# Dash Dental Production Readiness Audit

Date: 2026-06-01

This audit covers the six production-readiness layers requested for Dash Dental:
backend APIs, database integrity, integration resilience, AI guardrails, frontend
security/resilience, and final verification.

## Layer 1: Backend API Hardening

Implemented:

- Central API error handling now redacts sensitive details before returning JSON.
- Unexpected API errors are captured through structured logging with a correlation
  id instead of returning raw exceptions.
- Authenticated request context enforces same-origin protection for state-changing
  app routes.
- Admin support runtime mutations now use the same JSON parsing/security helper.
- Stripe and PMS webhooks reject malformed payloads with explicit validation
  errors instead of falling through as unexpected 500s.
- Public health/storage checks return safe generic dependency failures for
  unexpected exceptions.

Regression coverage:

- `tests/regression/api-hardening.test.ts`
- `tests/regression/observability-security.test.ts`

## Layer 2: Database Integrity

Implemented:

- `AiInsight.costEstimate` is now represented as Prisma `Decimal`; the migration
  converts the database column to `NUMERIC(12,6)`.
- Added hot-path indexes for memberships, conversations, delivery records, notes,
  subscriptions, billing events, AI insights, webhook receipts, and outbox events.
- Added database-level `CHECK` constraints for status-like string fields.
- PMS appointment statuses are normalized before persistence so constraints remain
  enforceable across providers.
- Credential persistence continues through encryption paths instead of plain text.

Migration:

- `prisma/migrations/20260601153000_production_data_integrity/migration.sql`

Regression coverage:

- `tests/regression/database-integrity.test.ts`

## Layer 3: Integration Resilience

Implemented:

- PMS polling is protected by a Redis `SET NX EX` lease to prevent duplicate syncs.
- PMS API calls use bounded retry and timeout behavior.
- PMS webhooks verify signatures first, acknowledge quickly, and process work via
  Next `after()`.
- Twilio webhook parsing rejects malformed JSON and invalid signatures before
  creating inbound records.
- Twilio SMS auto-replies use bounded retries and timeout protection.
- Email delivery no longer throws when provider config is missing in production;
  it returns a controlled failed result and logs a safe operational event.
- Email subjects that appear to include patient data are blocked before provider
  calls.

Regression coverage:

- `tests/regression/integration-resilience.test.ts`

Operational requirement:

- Production PMS polling requires `REDIS_URL`. Without it, production syncs fail
  closed instead of running without a lock.

## Layer 4: AI Guardrails

Implemented:

- AI reply guardrails now block PHI-like content, MRNs, diagnosis keywords,
  medications, prescriptions, guarantees, and multilingual risk phrasing.
- PHI-blocked drafts return no “safe rewritten” body, preventing accidental
  leakage of sensitive text.
- Gemini reply instructions now explicitly require conservative language and
  prohibit unnecessary patient identifiers.
- Added deterministic guardrail evaluation script:
  `npm run eval:guardrails`.
- AI reply draft route already persists/logs the insight before returning the
  draft to the user; regression coverage now locks that behavior.

Regression coverage:

- `tests/regression/ai-guardrails.test.ts`
- `tests/regression/ai-provider.test.ts`
- `scripts/eval-guardrails.ts`

## Layer 5: Frontend Security And Resilience

Implemented:

- Removed native `<form>` submission from active frontend components. Critical
  auth, invite, support, team, inbox, notes, and integration actions now use
  controlled state and explicit button handlers.
- Removed the unused legacy all-in-one client app bundle:
  `src/app/dental-recovery-app.tsx`.
- Added `safePathSegment` and `safeQueryString` helpers for dynamic client API
  paths and query strings.
- Encoded platform/debug and inbox dynamic links.
- Added segment-level error boundaries for auth, workspace, demo, platform, and
  support routes.
- Added loading states for auth, demo, platform, and support segments.
- Client-visible error fallbacks no longer render raw caught error messages or raw
  error objects.
- Regression tests verify that privileged UI surfaces are backed by API-layer
  role gates.

Regression coverage:

- `tests/regression/frontend-resilience.test.ts`

## Layer 6: Final Verification

Passed locally:

- `node --import tsx --test tests/regression/api-hardening.test.ts tests/regression/observability-security.test.ts tests/regression/database-integrity.test.ts tests/regression/integration-resilience.test.ts tests/regression/ai-guardrails.test.ts tests/regression/frontend-resilience.test.ts`
- `npm run eval:guardrails`
- `npm run lint`
- `npm run typecheck`
- `npm run test:regression`
- `npm run build`
- `npm run vercel:build`

Still required before production cutover:

- targeted Playwright smoke tests for demo, billing lock, auth, workspace access,
  integrations, and support upload.

## External Deployment Checklist

These controls cannot be fully enforced from the Next.js repository alone and
must be confirmed in Vercel, DNS/CDN, database, and operational tooling:

- HTTPS-only production traffic and HSTS enabled at the edge.
- Cloudflare/Vercel firewall rules for public APIs, auth, demo start, support
  upload, and webhook endpoints.
- DDoS mitigation and bot protection enabled for public landing/auth routes.
- Production `DATABASE_URL` uses a reachable primary endpoint and strict TLS.
- Production `REDIS_URL` configured for PMS/distributed locks.
- `APP_ENCRYPTION_SECRET`, `SESSION_SECRET`, webhook secrets, provider API keys,
  and manual billing envs configured only as server-side environment variables.
- Database backups follow the 3-2-1 policy with restore rehearsal evidence.
- Vercel production either uses a reachable `PRISMA_MIGRATE_DATABASE_URL` when
  `VERCEL_RUN_PRISMA_MIGRATIONS=true`, or runs migrations separately and leaves
  that flag disabled during app builds.
- Sentry or equivalent error capture configured through `SENTRY_DSN`.
