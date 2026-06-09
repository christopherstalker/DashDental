# First Clinic Launch Plan

This is the operating plan for giving Dental Recovery to the first real clinic.
It is intentionally practical: every item needs evidence before paid use.

## Launch Mode

- Billing mode: manual invoice first.
- Trial: 14 days.
- Paddle/Stripe checkout: disabled for first-clinic launch unless a separate
  online-provider rehearsal is approved. Stripe also requires
  `npm run stripe:rehearsal` to report ready.
- Compliance language: do not claim HIPAA, SOC 2, ISO, or certification status.
- Support: business-day support unless a signed order form says otherwise.

## Must Complete Before First Clinic

1. Legal pack approved.
   Evidence: `LEGAL_REVIEW_APPROVED=true`; DPA, subprocessors, order form, and cancellation/refund policy reviewed.
2. Production env reviewed.
   Evidence: `npm run go-live:check` has no `BLOCK` results for the launch hostname.
3. Manual billing ready.
   Evidence: invoice template, recipient name, IBAN, payment instructions, support email, and activation timing are approved.
4. Admin subscription workflow tested.
   Evidence: a fake clinic can be found in `/platform/subscriptions`, granted Growth, moved to read-only hold, and unlocked again.
5. Clinic onboarding script rehearsed.
   Evidence: first test lead reaches inbox and dashboard after a web-form test.
6. Support and incident contacts monitored.
   Evidence: support, billing, security, and incident emails route to a real person.
7. Data handling policy accepted.
   Evidence: clinic has been told not to paste medical records and that AI is assistant-only.
8. Monitoring ready.
   Evidence: synthetic/public smoke checks run manually before onboarding, and scheduled monitor is enabled when available.

## First Clinic Day-0 Flow

Automated guarded rehearsal:

```bash
FIRST_CLINIC_REHEARSAL_PRODUCTION=true \
PLAYWRIGHT_BASE_URL=https://dashdental.space \
FIRST_CLINIC_REHEARSAL_SESSION_COOKIE=<super-admin-cookie> \
npm run rehearsal:first-clinic
```

Alternative super-admin login mode can use
`FIRST_CLINIC_REHEARSAL_SUPER_ADMIN_EMAIL`,
`FIRST_CLINIC_REHEARSAL_SUPER_ADMIN_PASSWORD`, and, when bot protection is
required, `FIRST_CLINIC_REHEARSAL_TURNSTILE_TOKEN`. The rehearsal is skipped by
default and refuses non-production hostnames.

1. Create or register the clinic workspace.
2. Invite owner/admin/reception staff.
3. Confirm the 14-day trial and what locks after trial.
4. Connect web form first.
5. Send a test lead.
6. Confirm the lead appears in inbox, queue, and dashboard metrics.
7. Explain Ask AI boundaries: draft/help only; staff reviews before sending.
8. If payment is received, grant the plan in `/platform/subscriptions`.
9. Record invoice reference in the grant form.
10. Confirm audit log contains the subscription change.

## Launch Stop Conditions

- Public routes return 403, loop, or crash.
- Registration/login fails with Turnstile enabled.
- Trial workspace does not open after registration.
- Inbox cannot receive a test lead.
- Admin subscription grant does not write audit history.
- Billing/support/security contacts are not monitored.
- Health response exposes secrets, tokens, connection strings, or credentials.
- Legal approval is still false for paid use.

## Evidence Files

- `docs/legal/dpa-template.md`
- `docs/legal/subprocessors.md`
- `docs/legal/order-form-template.md`
- `docs/legal/cancellation-refund-policy.md`
- `docs/runbooks/clinic-onboarding.md`
- `docs/runbooks/manual-billing.md`
- `docs/runbooks/support-operations.md`
- `docs/runbooks/data-handling.md`
- `docs/runbooks/monitoring.md`
