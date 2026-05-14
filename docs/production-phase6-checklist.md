# Phase 6 Production Checklist

This phase is additive only. Do not run destructive resets in production.

## Order

1. Take a database backup and verify restore access.
2. Deploy the formal additive migration in `prisma/migrations/20260502060000_phase5_billing_usage_hardening/migration.sql`.
3. Run a dry-run backfill:

   ```bash
   tsx prisma/backfill-phase6.ts --dry-run
   ```

4. Review the structured `backfill.phase6.completed` log counts.
5. Run the write backfill:

   ```bash
   tsx prisma/backfill-phase6.ts --write
   ```

6. Re-run the dry-run. Counts should be stable and no destructive work should be planned.
7. Check `/api/v1/health/storage`; DB and required queue dependencies must be healthy before opening traffic.
8. Use support ledgers only through `/api/v1/admin/support/*` with a `super_admin` session.

## Backfill Scope

- `ConversationProjection`: rebuilt from current conversations/messages/leads.
- `MessageDelivery`: created for existing outbound messages that lack delivery rows.
- `BillingEvent`: fills missing customer/subscription references where inferable and marks reconstructed payloads explicitly.
- `UsageRollup`: rebuilt from immutable `UsageEvent` records using absolute quantities, not increments.

## Safety Notes

- The backfill is idempotent; writes use upsert/update by stable keys.
- The migration is non-destructive and uses `IF NOT EXISTS` guards.
- Logs redact tokens, signatures, emails, phones, raw bodies, message text, and patient fields.
- Production requires Redis queue configuration. Missing Redis is an unhealthy dependency, not a graceful production fallback.
