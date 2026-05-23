-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'manager', 'super_admin');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'trial', 'suspended');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'unanswered', 'at_risk', 'in_conversation', 'booked', 'lost');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('telegram', 'web_form', 'instagram', 'whatsapp', 'clinic_database');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('stripe', 'telegram', 'meta', 'web_form');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('active', 'pending', 'degraded', 'disconnected');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('pending', 'valid', 'invalid', 'skipped');

-- CreateEnum
CREATE TYPE "ReceiptProcessingStatus" AS ENUM ('received', 'processing', 'processed', 'failed', 'dead_letter', 'ignored');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'dispatching', 'dispatched', 'failed', 'dead_letter');

-- CreateEnum
CREATE TYPE "ReplayTargetType" AS ENUM ('webhook_receipt', 'outbox_event');

-- CreateEnum
CREATE TYPE "ReplayAttemptStatus" AS ENUM ('started', 'completed', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('patient', 'manager', 'automation', 'system');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'growth', 'scale');

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('processing', 'processed', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "DataLifecycleRunStatus" AS ENUM ('completed', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "averagePatientValue" INTEGER NOT NULL DEFAULT 500,
    "businessHours" JSONB NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'trial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInviteToken" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "emailDeliveryStatus" TEXT,
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "source" "Provider" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "assignedTo" TEXT,
    "providerContactId" TEXT NOT NULL,
    "firstMessageAt" TIMESTAMP(3) NOT NULL,
    "firstHumanResponseAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "estimatedValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT,
    "provider" "Provider" NOT NULL,
    "providerThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "payloadJson" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "outboxEventId" TEXT,
    "provider" "Provider" NOT NULL,
    "localMessageId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "MessageDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "authorMembershipId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'disconnected',
    "externalAccountId" TEXT NOT NULL DEFAULT '',
    "encryptedCredentials" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "errorState" TEXT,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataAccessContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_it_approval',
    "purpose" TEXT NOT NULL,
    "tablesJson" JSONB NOT NULL,
    "fieldsJson" JSONB NOT NULL,
    "piiCategoriesJson" JSONB NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "readOnly" BOOLEAN NOT NULL DEFAULT true,
    "approvedByName" TEXT,
    "approvedByEmail" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataAccessContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "plan" "SubscriptionPlan" NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "externalSubscriptionId" TEXT NOT NULL,
    "lastProviderEventId" TEXT,
    "lastProviderEventType" TEXT,
    "lastProviderEventAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "subscriptionId" TEXT,
    "outboxEventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerEventId" TEXT NOT NULL,
    "providerEventType" TEXT NOT NULL,
    "providerObjectId" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "status" "BillingEventStatus" NOT NULL DEFAULT 'processing',
    "decision" TEXT,
    "eventCreatedAt" TIMESTAMP(3) NOT NULL,
    "rawPayloadJson" JSONB,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditionsJson" JSONB NOT NULL,
    "template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "type" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "costEstimate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLimit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxIntegrations" INTEGER NOT NULL,
    "monthlyMessages" INTEGER NOT NULL,
    "monthlyAiRuns" INTEGER NOT NULL,
    "periodUsageJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRollup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phoneE164" TEXT,
    "emailLower" TEXT,
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'active',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactIdentity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "externalAccountId" TEXT NOT NULL DEFAULT '',
    "externalContactId" TEXT NOT NULL,
    "externalThreadId" TEXT NOT NULL DEFAULT '',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "integrationId" TEXT,
    "provider" "WebhookProvider" NOT NULL,
    "channelProvider" "Provider",
    "externalEventId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "payloadSha256" TEXT NOT NULL,
    "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'pending',
    "processingStatus" "ReceiptProcessingStatus" NOT NULL DEFAULT 'received',
    "correlationId" TEXT NOT NULL,
    "providerAccountKey" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimExpiresAt" TIMESTAMP(3),
    "firstProcessedAt" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,

    CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "receiptId" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "partitionKey" TEXT NOT NULL,
    "causationId" TEXT,
    "correlationId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimExpiresAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "targetType" "ReplayTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "force" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReplayAttemptStatus" NOT NULL DEFAULT 'started',
    "reason" TEXT,
    "requestedByUserId" TEXT,
    "correlationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "ReplayAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuntimeLease" (
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuntimeLease_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DataLifecycleRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" "DataLifecycleRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "DataLifecycleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationProjection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT,
    "provider" "Provider" NOT NULL,
    "providerThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadStatus" "LeadStatus" NOT NULL,
    "responseState" TEXT NOT NULL,
    "assignedTo" TEXT,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT,
    "lastMessageText" TEXT NOT NULL,
    "lastMessagePreview" TEXT NOT NULL DEFAULT '',
    "lastMessageDirection" "MessageDirection",
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "unreadInboundCount" INTEGER NOT NULL DEFAULT 0,
    "firstInboundAt" TIMESTAMP(3) NOT NULL,
    "firstHumanResponseAt" TIMESTAMP(3),
    "slaDeadlineAt" TIMESTAMP(3),
    "slaBreachedAt" TIMESTAMP(3),
    "atRisk" BOOLEAN NOT NULL DEFAULT false,
    "estimatedValue" INTEGER NOT NULL,
    "rebuiltAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL DEFAULT 'realtime',
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "unansweredLeads" INTEGER NOT NULL DEFAULT 0,
    "atRiskLeads" INTEGER NOT NULL DEFAULT 0,
    "inConversationLeads" INTEGER NOT NULL DEFAULT 0,
    "bookedLeads" INTEGER NOT NULL DEFAULT 0,
    "lostLeads" INTEGER NOT NULL DEFAULT 0,
    "openConversations" INTEGER NOT NULL DEFAULT 0,
    "unreadConversations" INTEGER NOT NULL DEFAULT 0,
    "unreadInboundMessages" INTEGER NOT NULL DEFAULT 0,
    "lostRevenue" INTEGER NOT NULL DEFAULT 0,
    "averageResponseMinutes" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" INTEGER NOT NULL DEFAULT 0,
    "rebuiltAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInviteToken_tokenHash_key" ON "TeamInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TeamInviteToken_membershipId_idx" ON "TeamInviteToken"("membershipId");

-- CreateIndex
CREATE INDEX "TeamInviteToken_organizationId_email_idx" ON "TeamInviteToken"("organizationId", "email");

-- CreateIndex
CREATE INDEX "TeamInviteToken_expiresAt_idx" ON "TeamInviteToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_firstMessageAt_idx" ON "Lead"("organizationId", "status", "firstMessageAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_assignedTo_idx" ON "Lead"("organizationId", "assignedTo");

-- CreateIndex
CREATE INDEX "Lead_organizationId_contactId_idx" ON "Lead"("organizationId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_source_providerContactId_key" ON "Lead"("organizationId", "source", "providerContactId");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_leadId_createdAt_idx" ON "LeadStatusHistory"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_lastMessageAt_idx" ON "Conversation"("organizationId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_contactId_idx" ON "Conversation"("organizationId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_provider_providerThreadId_key" ON "Conversation"("organizationId", "provider", "providerThreadId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_providerMessageId_key" ON "Message"("conversationId", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageDelivery_messageId_key" ON "MessageDelivery"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageDelivery_outboxEventId_key" ON "MessageDelivery"("outboxEventId");

-- CreateIndex
CREATE INDEX "MessageDelivery_organizationId_status_updatedAt_idx" ON "MessageDelivery"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_conversationId_status_idx" ON "MessageDelivery"("conversationId", "status");

-- CreateIndex
CREATE INDEX "MessageDelivery_provider_providerMessageId_idx" ON "MessageDelivery"("provider", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageDelivery_conversationId_localMessageId_key" ON "MessageDelivery"("conversationId", "localMessageId");

-- CreateIndex
CREATE INDEX "TeamNote_organizationId_createdAt_idx" ON "TeamNote"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamNote_organizationId_conversationId_createdAt_idx" ON "TeamNote"("organizationId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamNote_organizationId_leadId_createdAt_idx" ON "TeamNote"("organizationId", "leadId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamNote_authorMembershipId_createdAt_idx" ON "TeamNote"("authorMembershipId", "createdAt");

-- CreateIndex
CREATE INDEX "Integration_provider_externalAccountId_idx" ON "Integration"("provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "Integration_status_lastSyncAt_idx" ON "Integration"("status", "lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_provider_key" ON "Integration"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "DataAccessContract_organizationId_provider_status_idx" ON "DataAccessContract"("organizationId", "provider", "status");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_lastProviderEventAt_idx" ON "Subscription"("organizationId", "lastProviderEventAt");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_externalSubscriptionId_key" ON "Subscription"("organizationId", "externalSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_outboxEventId_key" ON "BillingEvent"("outboxEventId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_providerEventId_key" ON "BillingEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "BillingEvent_organizationId_eventCreatedAt_idx" ON "BillingEvent"("organizationId", "eventCreatedAt");

-- CreateIndex
CREATE INDEX "BillingEvent_status_createdAt_idx" ON "BillingEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingEvent_externalCustomerId_eventCreatedAt_idx" ON "BillingEvent"("externalCustomerId", "eventCreatedAt");

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_trigger_active_idx" ON "AutomationRule"("organizationId", "trigger", "active");

-- CreateIndex
CREATE INDEX "AiInsight_organizationId_type_createdAt_idx" ON "AiInsight"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AiInsight_conversationId_idx" ON "AiInsight"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLimit_organizationId_key" ON "UsageLimit"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_idempotencyKey_key" ON "UsageEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "UsageEvent_organizationId_metric_occurredAt_idx" ON "UsageEvent"("organizationId", "metric", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_organizationId_periodStart_idx" ON "UsageEvent"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_organizationId_metric_sourceEntityType_sourceEnt_key" ON "UsageEvent"("organizationId", "metric", "sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "UsageRollup_organizationId_periodStart_idx" ON "UsageRollup"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRollup_organizationId_metric_periodStart_key" ON "UsageRollup"("organizationId", "metric", "periodStart");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationEvent_organizationId_provider_status_idx" ON "IntegrationEvent"("organizationId", "provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_provider_providerEventId_key" ON "IntegrationEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_lastSeenAt_idx" ON "Contact"("organizationId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_phoneE164_key" ON "Contact"("organizationId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_emailLower_key" ON "Contact"("organizationId", "emailLower");

-- CreateIndex
CREATE INDEX "ContactIdentity_organizationId_provider_lastSeenAt_idx" ON "ContactIdentity"("organizationId", "provider", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ContactIdentity_contactId_provider_idx" ON "ContactIdentity"("contactId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ContactIdentity_organizationId_provider_externalAccountId_e_key" ON "ContactIdentity"("organizationId", "provider", "externalAccountId", "externalContactId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookReceipt_dedupeKey_key" ON "WebhookReceipt"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebhookReceipt_processingStatus_receivedAt_idx" ON "WebhookReceipt"("processingStatus", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookReceipt_provider_receivedAt_idx" ON "WebhookReceipt"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookReceipt_organizationId_provider_receivedAt_idx" ON "WebhookReceipt"("organizationId", "provider", "receivedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_partitionKey_createdAt_idx" ON "OutboxEvent"("partitionKey", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_organizationId_createdAt_idx" ON "OutboxEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReplayAttempt_targetType_targetId_startedAt_idx" ON "ReplayAttempt"("targetType", "targetId", "startedAt");

-- CreateIndex
CREATE INDEX "ReplayAttempt_organizationId_startedAt_idx" ON "ReplayAttempt"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "ReplayAttempt_status_startedAt_idx" ON "ReplayAttempt"("status", "startedAt");

-- CreateIndex
CREATE INDEX "RuntimeLease_expiresAt_idx" ON "RuntimeLease"("expiresAt");

-- CreateIndex
CREATE INDEX "DataLifecycleRun_organizationId_startedAt_idx" ON "DataLifecycleRun"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "DataLifecycleRun_status_startedAt_idx" ON "DataLifecycleRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "ConversationProjection_organizationId_status_lastMessageAt_idx" ON "ConversationProjection"("organizationId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationProjection_organizationId_responseState_slaDead_idx" ON "ConversationProjection"("organizationId", "responseState", "slaDeadlineAt");

-- CreateIndex
CREATE INDEX "ConversationProjection_organizationId_assignedTo_lastMessag_idx" ON "ConversationProjection"("organizationId", "assignedTo", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationProjection_conversationId_key" ON "ConversationProjection"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationProjection_organizationId_conversationId_key" ON "ConversationProjection"("organizationId", "conversationId");

-- CreateIndex
CREATE INDEX "OrganizationMetricSnapshot_snapshotKey_rebuiltAt_idx" ON "OrganizationMetricSnapshot"("snapshotKey", "rebuiltAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMetricSnapshot_organizationId_snapshotKey_key" ON "OrganizationMetricSnapshot"("organizationId", "snapshotKey");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_authorMembershipId_fkey" FOREIGN KEY ("authorMembershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAccessContract" ADD CONSTRAINT "DataAccessContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLimit" ADD CONSTRAINT "UsageLimit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRollup" ADD CONSTRAINT "UsageRollup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookReceipt" ADD CONSTRAINT "WebhookReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookReceipt" ADD CONSTRAINT "WebhookReceipt_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "WebhookReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAttempt" ADD CONSTRAINT "ReplayAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataLifecycleRun" ADD CONSTRAINT "DataLifecycleRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationProjection" ADD CONSTRAINT "ConversationProjection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMetricSnapshot" ADD CONSTRAINT "OrganizationMetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
