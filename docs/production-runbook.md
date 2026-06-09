# Production Runbook

This runbook is for operating the Dental Recovery SaaS runtime: Next.js app, NestJS backend, PostgreSQL, Redis/BullMQ, webhooks, billing, and support tooling.

## Required Services

- PostgreSQL: primary operational database.
- Redis: BullMQ queues for webhook processing, outbox dispatch, billing, AI, recovery, and reconciliation.
- Next.js app: user-facing web app and internal proxy routes.
- NestJS backend: durable webhook ingress, outbox dispatch, projections, billing sync, support console APIs.
- Billing state: manual subscription grants are the first-clinic source of
  truth; Paddle or Stripe webhooks become authoritative only when that online
  provider is explicitly selected and rehearsed.
- Provider webhooks: Telegram, Meta/WhatsApp/Instagram, and web forms.

## Required Environment

- `DATABASE_URL`: PostgreSQL connection string.
- `PRISMA_MIGRATE_DATABASE_URL`: optional direct PostgreSQL connection used only for Prisma deploy migrations. Prefer a non-pooled Neon URL with `sslmode=verify-full`.
- `VERCEL_RUN_PRISMA_MIGRATIONS`: keep `false` for normal Vercel builds. Set to `true` only for an explicit migration deployment where database reachability has already been verified.
- `REDIS_URL`: Redis connection string.
- `SESSION_SECRET`: Next.js workspace session signing secret.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: backend JWT validation secrets.
- `INTEGRATION_SECRET`: encryption key for clinic integration credentials and MFA TOTP secrets.
- `APP_URL`: public HTTPS app URL used by providers.
- `BACKEND_INTERNAL_URL`: internal URL from Next.js to Nest backend.
- `BILLING_PROVIDER`, `MANUAL_BILLING_*`, `MANUAL_INVOICE_TEMPLATE_APPROVED`:
  manual invoice launch route.
- `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_*`: Paddle self-serve billing when explicitly selected.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`: Stripe self-serve billing when explicitly selected.
- `SUPPORT_OWNER_NAME`, `SUPPORT_OWNER_EMAIL`, `SECURITY_CONTACT_EMAIL`, `INCIDENT_ESCALATION_EMAIL`: launch ownership and escalation contacts.
- `EDGE_PROTECTION_DEPLOYED`, `REQUIRE_PUBLIC_AUTH_BOT_PROTECTION`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: public abuse and bot protection controls.
- `SYNTHETIC_MONITOR_BASE_URL`, `SYNTHETIC_MONITOR_SCHEDULED`: scheduled launch monitor target and confirmation.
- `LEGAL_REVIEW_APPROVED`, `DPA_APPROVED`, `SUBPROCESSORS_APPROVED`, `ORDER_FORM_APPROVED`, `CANCELLATION_POLICY_APPROVED`: explicit confirmation that the paid launch legal pack has been reviewed.
- `DATA_HANDLING_POLICY_APPROVED`, `FIRST_CLINIC_REHEARSAL_APPROVED`, `MANUAL_INVOICE_TEMPLATE_APPROVED`, `PRODUCTION_MONITOR_POLICY_APPROVED`, `DATABASE_BACKUPS_CONFIRMED`: first-clinic launch gates for operations, finance, monitoring, and database safety.
- `TENANT_OUTBOX_BACKPRESSURE_LIMIT`: per-tenant pending/dispatching outbox limit before defer.
- `OPERATIONAL_EVENT_RETENTION_DAYS`, `BILLING_EVENT_RETENTION_DAYS`, `REPLAY_ATTEMPT_RETENTION_DAYS`, `INTEGRATION_EVENT_RETENTION_DAYS`: retention policy controls.

## Deployment Checklist

1. Run `npm run prisma:generate` from the repo root.
2. Run `cd backend && npm run prisma:generate`.
3. Apply schema with migrations in production from a controlled migration run. For local/dev only, `npm run db:push` is acceptable.
4. Build backend with `cd backend && npm run build`.
5. Build frontend with `npm run build`.
6. Apply `docs/edge-protection.md` at the CDN/edge layer before broad self-serve traffic.
7. Confirm app-level HTTPS redirect, HSTS, CSP, COOP/CORP, frame deny, referrer policy, and permissions policy headers on a staging page.
8. Start backend and verify `/api/v1/admin/overview` with a super-admin token.
9. Start frontend and open `/platform`.
10. Run a non-destructive lifecycle dry-run from the platform console.
11. Run `npm run go-live:check` in staging. Block launch until the command reports `ready`.
12. Run `npm run monitor:preview` against a public Vercel preview, then `npm run monitor:synthetic:guarded` against controlled staging when demo reset/support paths are approved.

## Staging Rehearsal

Use `docs/env.md`, `.env.production.example`, and `.env.staging.template` as
operator-facing sources for staging variables. Example files intentionally keep
secrets blank and keep external confirmations set to `false` until the matching
provider setup is complete.

1. Fill staging `APP_URL`, database, Redis, session, JWT, integration, support,
   incident, manual billing, and Turnstile values.
2. Apply the CDN and webhook rules from `docs/edge-protection.md`, then set
   `EDGE_PROTECTION_DEPLOYED=true`.
3. Configure GitHub Actions `Staging` and `Production` environments, including
   required reviewers for `production`, then set variables and secrets used by
   `.github/workflows/go-live-rehearsal-fixed.yml` and
   `.github/workflows/go-live-rescue.yml`.
4. Run the `Go-Live Rehearsal` workflow manually against the staging hostname.
5. Treat `docs/launch-checklist.json` as the machine-readable launch contract:
   every blocker in it needs evidence before paid traffic.
6. Use `docs/first-clinic-launch-plan.md` for the fake-clinic rehearsal before
   the first real clinic gets live data.
7. Keep production runtime secrets in the Vercel project environment. Vercel
   uses `npm run vercel:build`, which runs `npm run go-live:check` only for
   `VERCEL_ENV=production` before the production build is allowed to continue.
   The build does not run Prisma migrations by default; run migrations as a
   separate release step, or set `VERCEL_RUN_PRISMA_MIGRATIONS=true` with
   `PRISMA_MIGRATE_DATABASE_URL` for one explicit migration build.
   Do not rely on `vercel env pull` as proof for sensitive values; sensitive
   values may be listed by name without being readable by local tooling.

## Smoke Tests

- Observability: call any backend endpoint with `x-correlation-id` and confirm the same header is returned and logged.
- Projection rebuild: run `POST /api/v1/admin/runtime/projections/rebuild` and verify missing/stale projection counts are zero.
- Failure drill: run `telegram.duplicate_inbound` and confirm only one durable receipt/message is materialized.
- Replay safety: replay an invalid receipt without force and confirm `skipped: invalid-signature`.
- Billing safety: request a manual invoice, grant access from `/platform/subscriptions`, and confirm the audit entry includes actor, plan, period, and invoice reference.
- Online-provider safety, when enabled: replay the same Paddle or Stripe provider event id twice and confirm the second event is already recorded.
- Data lifecycle: run `POST /api/v1/admin/runtime/data-lifecycle/sweep` with `{ "dryRun": true }`.

## Go-Live Billing and Legal Pack

For first-clinic paid launch, ship manual invoice first. Before taking broad
paid self-serve traffic, complete a separate online-provider handoff:

- External setup checklist: use `docs/external-launch-setup.md` for Turnstile,
  CDN/edge rules, GitHub monitor variables, and legal approval evidence.
- Manual invoice path: set `BILLING_PROVIDER=manual`, fill `MANUAL_BILLING_*`, verify `/billing` shows only non-secret bank/payment instructions, and document the support SLA for activating paid access after payment confirmation.
- Paddle checkout path, deferred: set `BILLING_PROVIDER=paddle` or explicit `hybrid`, configure the Paddle webhook destination at `/api/v1/webhooks/paddle`, fill `PADDLE_PRICE_*`, and verify Checkout, Portal, webhook signature verification, and subscription ledger reconciliation in staging before taking paid self-serve traffic.
- Hard lock path: after the 14-day trial or current period ends, verify `/dashboard`, `/inbox`, `/settings`, integrations, exports, sends, AI, and workspace API reads return billing-only access while `/billing`, `/workspaces`, and logout remain reachable.
- Stripe-ready path, deferred fallback: if Stripe is explicitly enabled, confirm live `STRIPE_PRICE_*`, Checkout, Portal, webhook signature verification, and subscription ledger reconciliation in staging before enabling production plan changes.
- Stripe live-mode rehearsal: run `npm run stripe:rehearsal` only before enabling broad Stripe self-serve; blocked checks are launch blockers for Stripe billing.
- Go-live readiness gate: run `npm run go-live:check` after edge rules, bot protection, legal review, support ownership, billing mode, and synthetic monitor scheduling are configured. Treat any `BLOCK` as a launch blocker.
- Trial and retention terms: confirm public pricing, trial, privacy, and terms pages all state the 14-day trial, read-only/payment-required behavior, and operational retention boundaries.
- DPA readiness: review `docs/legal/dpa-template.md` with counsel before signing customers. Do not imply HIPAA, SOC 2, ISO, or other certifications unless they are actually completed.
- Subprocessor list: maintain `docs/legal/subprocessors.md` for hosting, database, queue, billing, email/support, analytics/logging, and messaging providers used in production.
- Order form: use `docs/legal/order-form-template.md` and keep Starter/Growth/Scale plan limits, seats, monthly messages, AI limits, support path, cancellation, upgrade/downgrade, and manual invoice timing consistent with the public pricing page.
- Cancellation/refund policy: review `docs/legal/cancellation-refund-policy.md` before paid launch and link it from customer order forms.
- First-clinic launch pack: review `docs/first-clinic-launch-plan.md` and the
  runbooks in `docs/runbooks/` before onboarding the first clinic.

## Launch Funnel Instrumentation

The frontend emits a small allowlisted event set to `POST /api/v1/launch/events`. The endpoint logs sanitized event context only; it must never receive patient messages, phone numbers, email addresses, arbitrary metadata, or provider payloads.

Allowlisted launch events:

- `public.home.start_trial_clicked`: buyer clicks a homepage start-trial CTA.
- `public.home.demo_clicked`: buyer opens the product demo from public pages.
- `public.pricing.plan_clicked`: buyer clicks a pricing or plan CTA.
- `public.trial.start_clicked`: buyer starts from the trial explainer.
- `auth.register.submitted`: clinic submits the registration form.
- `auth.register.created`: registration succeeds and the owner workspace is created.
- `workspace.setup.viewed`: owner/admin reaches setup with readiness, billing, and next-gate context.
- `workspace.setup.next_action_clicked`: owner/admin clicks the next onboarding action.
- `workspace.setup.channel_clicked`: owner/admin opens channel setup from onboarding.
- `workspace.billing.invoice_requested`: owner requests manual invoice activation.

Review launch funnel logs daily during launch week:

1. Compare `public.home.start_trial_clicked` to `auth.register.created` for trial conversion.
2. Compare `auth.register.created` to `workspace.setup.next_action_clicked` for onboarding drop-off.
3. If Growth plan clicks do not become registrations, review pricing copy and manual invoice friction.
4. If setup clicks repeat without first lead creation, support should inspect channel credentials and web-form test leads.
5. Treat analytics gaps as observability issues first, not marketing conclusions.

## Synthetic Launch Monitors

Run these monitors from the public production hostname and at least one preview hostname:

- `GET /`, `/pricing`, `/demo`, `/trial`, `/qa`, `/security`, `/privacy`, `/terms`: expect status below 400 and no 403.
- Open `/demo/start`: expect an immediate redirect to `/demo/live`, a 15-minute countdown, fake data only, and no access to `/api/v1/state` with the demo cookie.
- Click the homepage hero trial CTA and confirm a `public.home.start_trial_clicked` event reaches `/api/v1/launch/events`.
- Load `/register`, submit a synthetic non-production clinic, and confirm a 14-day trial workspace reaches `/setup`.
- Load `/setup` as owner/admin and confirm the Launch drop-off review shows the next measurable action.
- Load `/billing` after an expired trial and confirm read-only billing activation is still reachable.
- Verify privileged owner/admin routes require a fresh MFA session in production.
- Call `/api/v1/health/storage` and confirm no connection strings, tokens, secrets, or credentials appear in the response.

The repository includes `.github/workflows/synthetic-monitor.yml` for a scheduled
and manual monitor run. Configure the `SYNTHETIC_MONITOR_BASE_URL` GitHub secret
to the preview or controlled staging hostname first. The default
`SYNTHETIC_MONITOR_MODE=preview` runs `npm run monitor:preview`, which checks
public routes, health secrecy, and real trial registration without requiring
demo reset access. Use `SYNTHETIC_MONITOR_MODE=full` for
`npm run monitor:synthetic:guarded` after the demo reset/support path is approved.
Both modes block missing targets, non-HTTPS non-local targets, and known
production hostnames unless `SYNTHETIC_MONITOR_ALLOW_PRODUCTION=true`.

The full synthetic monitor creates non-production trial workspaces and uses the
demo support path. Do not point it at production until the production monitor
tenant and cleanup policy are explicitly approved. Keep synthetic registrations
tagged with `synthetic-...@clinic.example`, review them weekly during launch,
and clean them using the approved data policy for test tenants.

## Launch Ownership

- The launch support owner named in `SUPPORT_OWNER_NAME` owns first-response triage during launch week.
- `SUPPORT_OWNER_EMAIL` receives buyer/trial/billing support escalations.
- `SECURITY_CONTACT_EMAIL` is the public security reporting contact.
- `INCIDENT_ESCALATION_EMAIL` is for urgent runtime, webhook, billing, or data-access incidents.
- Update these contacts before every paid launch batch and re-run `npm run go-live:check`.

## Incident Flow

1. Start at `/platform` and read Runtime alerts first.
2. Open the newest Problem queue item.
3. Open tenant timeline and inspect receipt, outbox, replay ledger, usage, integration, and audit facts.
4. Fix provider credentials, tenant mapping, or payload shape before replay.
5. Prefer safe outbox replay before receipt replay.
6. Use force replay only after confirming idempotency for the target event.
7. After recovery, rebuild projections if dashboard counters look stale.

## Alert Runbooks

- `critical_queue_failed_jobs`: inspect newest failed queue payload, verify Redis/worker health, then replay specific jobs.
- `queue_processing_paused`: confirm pause was intentional before resuming.
- `dead_letter_work`: inspect payload and mapping before any bulk replay.
- `billing_event_failures`: inspect `BillingEvent` ledger and Stripe payload before replaying.
- `billing_event_stuck_processing`: retry only the affected outbox event after worker health is normal.
- `projection_drift`: run projection rebuild before trusting dashboard counters.
- `unresolved_webhook_tenant`: fix provider account mapping; replay alone will not heal tenancy.
- `data_lifecycle_purge_backlog`: run dry-run first, then delete during a low-traffic window.

## Data Lifecycle Policy

The automated lifecycle sweep deletes only operational records that are already terminal and older than configured retention:

- `WebhookReceipt`: only `processed` or `ignored`, and only when no outbox events remain.
- `OutboxEvent`: only `dispatched`.
- `BillingEvent`: only `processed` or `skipped`.
- `ReplayAttempt`: only `completed` or `skipped`.
- `IntegrationEvent`: only processed historical integration events.

The sweep does not delete audit logs, leads, contacts, conversations, messages, subscriptions, or clinic contracts.

## Recovery Rules

- Recovery and reconciliation use runtime leases where applicable to avoid duplicate sweeps.
- Replay attempts are recorded in `ReplayAttempt`.
- Billing provider events are recorded in `BillingEvent`.
- Data lifecycle runs are recorded in `DataLifecycleRun`.
- Every support action should have a correlation id in request logs.
