# Data Handling Policy

This policy is the plain-language launch boundary for clinics and operators.

## Allowed Use

Dental Recovery is for lead intake, reception follow-up, routing, reply drafting,
and owner visibility into lost revenue risk.

## Do Not Enter

Clinics should not paste medical records, diagnoses, treatment plans, insurance
documents, payment card numbers, passwords, or government identity documents into
patient messages, notes, AI prompts, or support requests.

## AI Boundary

- AI can summarize, draft, and prioritize reception work.
- AI does not make clinical, legal, billing, or compliance decisions.
- Staff must review AI-generated replies before sending.
- Deterministic system rules own subscriptions, limits, access, and SLA state.

## Retention

Operational event retention is controlled by environment variables:

- `OPERATIONAL_EVENT_RETENTION_DAYS`
- `BILLING_EVENT_RETENTION_DAYS`
- `REPLAY_ATTEMPT_RETENTION_DAYS`
- `INTEGRATION_EVENT_RETENTION_DAYS`

Automated sweeps do not delete leads, contacts, conversations, messages,
subscriptions, or audit logs. Export or deletion requests require an approved
support/legal workflow.

## Support Handling

- Support may ask for timestamps, clinic id, route, integration name, and invoice reference.
- Support should not ask for patient medical records or provider secrets.
- If a clinic shares sensitive content by mistake, treat it as support data and escalate if needed.
