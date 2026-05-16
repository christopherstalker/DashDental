# Subprocessor Register

This register should be reviewed before each paid launch batch and whenever a
provider changes. It is a working register, not a certification claim.

| Category | Provider | Purpose | Data Processed | Notes |
| --- | --- | --- | --- | --- |
| Hosting | Production hosting provider | Next.js app and backend runtime | Account, workspace, message metadata | Confirm production region and support plan before go-live |
| Database | PostgreSQL provider | Primary operational store | Tenant data, messages, billing, audit logs | Encryption and backups must be configured at provider level |
| Queue | Redis/BullMQ provider | Async webhook/outbox/billing processing | Event ids, tenant ids, retry metadata | Do not store provider secrets in queue payloads |
| Billing | Stripe, when enabled | Checkout, Portal, subscription webhooks | Customer id, plan, invoice/payment status | Use Billing APIs, Checkout Sessions, Prices, and Customer Portal |
| Manual billing | Bank/payment processor | Bank transfer and invoice settlement | Invoice reference, payment status | Do not expose bank admin credentials in the app |
| Messaging | Telegram, Meta/WhatsApp/Instagram, web forms | Patient intake and reply delivery | Channel ids, messages, provider event ids | Provider policy changes can affect delivery |
| Analytics/logging | Logging provider | Launch funnel and operational debugging | Sanitized route/event context | No patient text, emails, phones, secrets, or provider payloads |
| Support | Support inbox/tooling | Customer support and incident handling | Customer contacts and support facts | Support actions must be audited |

## Change Process

1. Add provider, purpose, data categories, and region if applicable.
2. Confirm the provider is covered by contract, DPA, or equivalent terms.
3. Update customer-facing notices before using the provider for production data.
4. Keep old entries available for audit history.

<!-- git-for-windows loose-object path workaround -->
