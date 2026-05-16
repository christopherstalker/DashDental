# External Launch Setup

Use this when moving from the free Vercel Preview rehearsal to paid production
traffic. Do not set the matching readiness flags to `true` until the evidence is
real for the launch hostname.

## Turnstile

1. Open the Cloudflare dashboard for the account that owns the launch hostname.
2. Create a Turnstile widget for the production hostname and any preview hostname
   you will use for launch rehearsal.
3. Copy the site key to Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Copy the secret key to Vercel as `TURNSTILE_SECRET_KEY`.
5. Deploy once with the keys present.
6. Set `REQUIRE_PUBLIC_AUTH_BOT_PROTECTION=true` only after `/login` and
   `/register` show the challenge and registration succeeds.

## Edge Rules

The current free Preview uses app-side throttles as a fallback. For broad paid
self-serve traffic, apply equivalent CDN or Vercel Firewall rules:

- Rate-limit `/api/v1/auth/register` to 8-10 requests per minute per IP.
- Rate-limit `/api/v1/auth/session` to 60 requests per minute per IP.
- Rate-limit `/api/v1/launch/events` to 120 requests per minute per IP.
- Rate-limit `/api/v1/health/storage` to 30 requests per minute per IP.
- Do not challenge `/api/v1/webhooks/*`; rely on provider signatures, secrets,
  and idempotency.

Set `EDGE_PROTECTION_DEPLOYED=true` only after those rules are live.

## GitHub Actions Monitors

When this project is attached to a GitHub repo, configure Actions secrets and
variables:

- Secret `SYNTHETIC_MONITOR_BASE_URL`: preview or staging HTTPS hostname.
- Variable `SYNTHETIC_MONITOR_MODE`: `preview` for public smoke, `full` for
  controlled staging.
- Variable `SYNTHETIC_MONITOR_SCHEDULED`: `true` only after the scheduled
  workflow is enabled and passing.
- For full go-live rehearsal, also set `STAGING_DATABASE_URL`,
  `STAGING_REDIS_URL`, `STAGING_SESSION_SECRET`, `TURNSTILE_SECRET_KEY`, and any
  Stripe secrets used by the selected billing mode.

## Legal Approval

Review the legal pack with the launch owner or counsel before paid traffic:

- `docs/legal/dpa-template.md`
- `docs/legal/subprocessors.md`
- `docs/legal/order-form-template.md`
- `docs/legal/cancellation-refund-policy.md`

Set `LEGAL_REVIEW_APPROVED=true` only after that review is complete.

Set these granular approvals only after the matching file is approved:

- `DPA_APPROVED=true`
- `SUBPROCESSORS_APPROVED=true`
- `ORDER_FORM_APPROVED=true`
- `CANCELLATION_POLICY_APPROVED=true`
- `DATA_HANDLING_POLICY_APPROVED=true`

## First Clinic Rehearsal

Before giving access to a real clinic, run the fake-clinic rehearsal in
`docs/first-clinic-launch-plan.md`:

1. Register a fake clinic.
2. Grant Growth in `/platform/subscriptions`.
3. Move the clinic to read-only hold.
4. Unlock it again.
5. Send a web-form test lead.
6. Reply from inbox.
7. Confirm dashboard metrics and audit history.

Set `FIRST_CLINIC_REHEARSAL_APPROVED=true` only after this rehearsal passes.

## Manual Invoice Approval

Manual-only launch still needs a finance-safe invoice process:

- invoice template approved;
- bank/payment instructions approved;
- late-payment/read-only hold path approved;
- activation timing approved.

Set `MANUAL_INVOICE_TEMPLATE_APPROVED=true` after those are complete.
