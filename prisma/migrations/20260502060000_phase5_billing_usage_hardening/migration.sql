-- Phase 5 formal additive migration.
-- This mirrors the local SQL hardening patch used when Prisma schema-engine failed.
-- It is intentionally non-destructive and safe to apply to an already-patched database.

ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "externalCustomerId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "externalSubscriptionId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "rawPayloadJson" JSONB;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "lastErrorMessage" TEXT;

ALTER TABLE "UsageEvent" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "UsageEvent"
SET "idempotencyKey" = concat("organizationId", ':', "metric", ':', "sourceEntityType", ':', "sourceEntityId")
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "UsageEvent" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UsageEvent_idempotencyKey_key"
  ON "UsageEvent"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "UsageRollup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "lastEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRollup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UsageRollup_organizationId_metric_periodStart_key"
  ON "UsageRollup"("organizationId", "metric", "periodStart");

CREATE INDEX IF NOT EXISTS "UsageRollup_organizationId_periodStart_idx"
  ON "UsageRollup"("organizationId", "periodStart");

CREATE INDEX IF NOT EXISTS "BillingEvent_externalCustomerId_eventCreatedAt_idx"
  ON "BillingEvent"("externalCustomerId", "eventCreatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingEvent_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "BillingEvent"
      ADD CONSTRAINT "BillingEvent_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UsageRollup_organizationId_fkey'
  ) THEN
    ALTER TABLE "UsageRollup"
      ADD CONSTRAINT "UsageRollup_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
