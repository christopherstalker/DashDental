# Data Processing Addendum Template

This template is the launch-ready working draft for customer legal review. It
does not claim HIPAA, SOC 2, ISO, or other certifications.

## Parties

- Customer: the dental clinic or clinic group named in the order form.
- Processor: Dental Recovery / Dash Dental operating the SaaS platform.

## Processing Scope

Dental Recovery processes patient lead intake, conversation metadata, messages,
front-desk notes, integration events, billing records, audit logs, and usage
records only to provide the recovery inbox, routing, metering, billing, support,
security, and operational maintenance.

## Customer Instructions

The customer controls which channels are connected and remains responsible for
lawful notices, patient consent, clinical decision-making, and medical record
systems. Dental Recovery does not provide medical advice and does not make
clinical, billing, or compliance decisions.

## Security Measures

- Tenant-scoped access control.
- Session signing and protected workspace routes.
- Webhook signature and secret validation where providers support it.
- Durable webhook receipt and outbound outbox processing.
- Support audit logging for replay, retry, and reconciliation actions.
- Secret redaction in structured logs and health responses.

## Subprocessors

Approved subprocessors are listed in `docs/legal/subprocessors.md`. Material
changes should be communicated to customers using the support/legal contact
defined in the order form.

## Retention

Operational event retention is configured by environment policy. Leads,
conversations, messages, billing records, subscriptions, and audit logs are not
deleted by automated operational sweeps unless a separate customer deletion
workflow is approved.

## Incident Notice

Dental Recovery will investigate security incidents, preserve relevant audit
facts, and notify affected customers without unreasonable delay after confirming
an incident that impacts customer data.
