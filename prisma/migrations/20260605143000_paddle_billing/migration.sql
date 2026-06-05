-- Add Paddle as a durable webhook provider and allow billing events that are
-- applied directly from provider webhooks without an intermediate outbox row.
ALTER TYPE "WebhookProvider" ADD VALUE IF NOT EXISTS 'paddle';

ALTER TABLE "BillingEvent"
  ALTER COLUMN "outboxEventId" DROP NOT NULL;
