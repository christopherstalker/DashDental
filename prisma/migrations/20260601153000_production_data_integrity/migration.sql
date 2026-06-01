-- Production data-integrity hardening.
-- This migration is additive and idempotent so it can run safely after the
-- already-applied baseline migrations in production.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'AiInsight'
      AND column_name = 'costEstimate'
      AND data_type = 'double precision'
  ) THEN
    ALTER TABLE "AiInsight"
      ALTER COLUMN "costEstimate" TYPE NUMERIC(12, 6)
      USING round("costEstimate"::numeric, 6);
  END IF;
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Membership_organizationId_status_createdAt_idx"
  ON "Membership"("organizationId", "status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Conversation_leadId_idx"
  ON "Conversation"("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MessageDelivery_organizationId_updatedAt_idx"
  ON "MessageDelivery"("organizationId", "updatedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TeamNote_authorUserId_createdAt_idx"
  ON "TeamNote"("authorUserId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Subscription_organizationId_updatedAt_idx"
  ON "Subscription"("organizationId", "updatedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BillingEvent_subscriptionId_idx"
  ON "BillingEvent"("subscriptionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AiInsight_leadId_idx"
  ON "AiInsight"("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookReceipt_integrationId_idx"
  ON "WebhookReceipt"("integrationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookReceipt_organizationId_receivedAt_idx"
  ON "WebhookReceipt"("organizationId", "receivedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OutboxEvent_receiptId_idx"
  ON "OutboxEvent"("receiptId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_status_check') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_status_check"
      CHECK ("status" IN ('active', 'invited', 'disabled')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_status_check') THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_status_check"
      CHECK ("status" IN ('active', 'invited', 'disabled')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamInviteToken_emailDeliveryStatus_check') THEN
    ALTER TABLE "TeamInviteToken"
      ADD CONSTRAINT "TeamInviteToken_emailDeliveryStatus_check"
      CHECK ("emailDeliveryStatus" IS NULL OR "emailDeliveryStatus" IN ('pending', 'sent', 'skipped', 'failed')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_status_check') THEN
    ALTER TABLE "Conversation"
      ADD CONSTRAINT "Conversation_status_check"
      CHECK ("status" IN ('open', 'closed')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationReminder_status_check') THEN
    ALTER TABLE "ConversationReminder"
      ADD CONSTRAINT "ConversationReminder_status_check"
      CHECK ("status" IN ('scheduled', 'completed', 'canceled')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OutgoingWebhookEndpoint_status_check') THEN
    ALTER TABLE "OutgoingWebhookEndpoint"
      ADD CONSTRAINT "OutgoingWebhookEndpoint_status_check"
      CHECK ("status" IN ('active', 'paused', 'failed')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerApiKey_status_check') THEN
    ALTER TABLE "PartnerApiKey"
      ADD CONSTRAINT "PartnerApiKey_status_check"
      CHECK ("status" IN ('active', 'revoked')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyDigest_status_check') THEN
    ALTER TABLE "WeeklyDigest"
      ADD CONSTRAINT "WeeklyDigest_status_check"
      CHECK ("status" IN ('draft', 'queued', 'sent', 'failed')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataAccessContract_status_check') THEN
    ALTER TABLE "DataAccessContract"
      ADD CONSTRAINT "DataAccessContract_status_check"
      CHECK ("status" IN ('draft', 'pending_it_approval', 'approved', 'revoked')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_status_check') THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_status_check"
      CHECK ("status" IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'read_only')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRule_trigger_check') THEN
    ALTER TABLE "AutomationRule"
      ADD CONSTRAINT "AutomationRule_trigger_check"
      CHECK ("trigger" IN ('first_inbound', 'outside_business_hours', 'sla_warning')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiInsight_type_check') THEN
    ALTER TABLE "AiInsight"
      ADD CONSTRAINT "AiInsight_type_check"
      CHECK ("type" IN ('conversation_summary', 'reply_draft', 'risk_detection', 'intent_classification', 'weekly_insight')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntegrationEvent_status_check') THEN
    ALTER TABLE "IntegrationEvent"
      ADD CONSTRAINT "IntegrationEvent_status_check"
      CHECK ("status" IN ('received', 'processed', 'failed', 'dead_letter')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_lifecycleStatus_check') THEN
    ALTER TABLE "Contact"
      ADD CONSTRAINT "Contact_lifecycleStatus_check"
      CHECK ("lifecycleStatus" IN ('active', 'merged', 'deleted')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationProjection_status_check') THEN
    ALTER TABLE "ConversationProjection"
      ADD CONSTRAINT "ConversationProjection_status_check"
      CHECK ("status" IN ('open', 'closed')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationProjection_responseState_check') THEN
    ALTER TABLE "ConversationProjection"
      ADD CONSTRAINT "ConversationProjection_responseState_check"
      CHECK ("responseState" IN ('closed', 'overdue', 'responded', 'waiting', 'warning')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check') THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_status_check"
      CHECK ("status" IN ('scheduled', 'confirmed', 'completed', 'canceled', 'deleted', 'no_show')) NOT VALID;
  END IF;
END $$;
