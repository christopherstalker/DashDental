# Support Operations Runbook

This is the first-line support checklist for launch week.

## Contacts

- Support owner: `SUPPORT_OWNER_NAME` and `SUPPORT_OWNER_EMAIL`.
- Billing support: `MANUAL_BILLING_SUPPORT_EMAIL`.
- Security contact: `SECURITY_CONTACT_EMAIL`.
- Incident escalation: `INCIDENT_ESCALATION_EMAIL`.

## Response Promise

Default launch promise: business-day support. Do not promise 24/7 support unless
an order form explicitly includes it.

## Common Issues

### Login Or Registration

1. Confirm public route opens without 403.
2. Confirm Turnstile is configured if bot protection is required.
3. Confirm the user email belongs to the right clinic membership.
4. Check Vercel logs for auth errors.

### Webhook Or Test Lead Missing

1. Open `/platform`.
2. Check health, receipt, outbox, and projection alerts.
3. Check provider secret/signature configuration.
4. Replay only the affected receipt or outbox event after validating tenant mapping.
5. Confirm inbox and dashboard counters updated.

### Failed Reply Send

1. Check message delivery status.
2. Check outbox error and provider credentials.
3. Retry the specific failed outbox event if credentials are fixed.
4. Tell the clinic whether the reply was sent, queued, or failed.

### Billing Lock

1. Confirm subscription status and current period.
2. If payment is confirmed, grant active access in `/platform/subscriptions`.
3. If payment is late, use read-only hold and explain what remains available.
4. Confirm audit log has the change.

## Safety Rules

- Never paste secrets into support messages.
- Never expose cross-tenant data to a clinic.
- Never replay events in bulk before checking tenant mapping.
- Every replay, retry, reconcile, or subscription change must be audit logged.
