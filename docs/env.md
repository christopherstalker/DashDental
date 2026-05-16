# Dash Dental environment variables

This guide is the production/staging checklist for environment setup. It uses
safe placeholders only; real values belong in the hosting provider, not in Git.

## Required for production launch

| Variable | Scope | Required | Purpose | Where to get it |
| --- | --- | --- | --- | --- |
| `APP_URL` | server | yes | Public HTTPS origin for links, redirects, and webhooks. | Production/staging domain. |
| `DATABASE_URL` | server | yes | Managed Postgres database used by Prisma storage. | Neon/Postgres provider. |
| `REDIS_URL` | server | yes | Runtime queues and background processing. | Managed Redis provider. |
| `SESSION_SECRET` | server | yes | Session cookie signing. | Password manager/secret generator. |
| `JWT_ACCESS_SECRET` | server | yes | Backend access token signing. | Password manager/secret generator. |
| `JWT_REFRESH_SECRET` | server | yes | Backend refresh token signing. | Password manager/secret generator. |
| `INTEGRATION_SECRET` | server | yes | Encrypts integration credentials. | Password manager/secret generator. |
| `REQUIRE_PUBLIC_AUTH_BOT_PROTECTION` | server | yes | Forces Turnstile on public auth. | Set to `true` after widget setup. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | yes | Turnstile widget site key. | Cloudflare Turnstile. |
| `TURNSTILE_SECRET_KEY` | server | yes | Turnstile verification secret. | Cloudflare Turnstile. |
| `SUPPORT_OWNER_EMAIL` | server | yes | Launch support owner inbox. | `support@dashdental.space`. |
| `SECURITY_CONTACT_EMAIL` | server | yes | Security report contact. | `security@dashdental.space`. |
| `INCIDENT_ESCALATION_EMAIL` | server | yes | Urgent incident escalation. | Security/support routing. |
| `BILLING_PROVIDER` | server | yes | `manual`, `stripe`, or `hybrid`. | Release decision. |

## Launch approval gates

`npm run go-live:check` intentionally blocks until these are explicitly true:

- `DATABASE_BACKUPS_CONFIRMED`
- `EDGE_PROTECTION_DEPLOYED`
- `LEGAL_REVIEW_APPROVED`
- `DPA_APPROVED`
- `SUBPROCESSORS_APPROVED`
- `ORDER_FORM_APPROVED`
- `CANCELLATION_POLICY_APPROVED`
- `DATA_HANDLING_POLICY_APPROVED`
- `FIRST_CLINIC_REHEARSAL_APPROVED`
- `SYNTHETIC_MONITOR_SCHEDULED`
- `PRODUCTION_MONITOR_POLICY_APPROVED`
- `MANUAL_INVOICE_TEMPLATE_APPROVED` when using manual billing

Do not set these to `true` until the external action is actually complete.

## Public contact policy

Public UI and customer-facing docs should use:

- `support@dashdental.space`
- `security@dashdental.space`
- `privacy@dashdental.space`

Mailboxes/routing must be verified externally before launch. Do not claim email
routing is verified inside the app unless a real receipt test has been run.

## Examples

- `.env.example` is local/development-oriented.
- `.env.production.example` is the clean production template.
- `.env.staging.example` should mirror production with staging domains and test
  resources. If that file is unreadable locally, repair the filesystem first,
  then recreate it from `.env.production.example` with staging values.
