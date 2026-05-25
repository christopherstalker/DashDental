CREATE TABLE "ReplyTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationReminder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "note" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutgoingWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventsJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "secretPreview" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutgoingWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopesJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyDigest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyDigest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReplyTemplate_organizationId_category_idx" ON "ReplyTemplate"("organizationId", "category");
CREATE INDEX "ConversationReminder_organizationId_status_remindAt_idx" ON "ConversationReminder"("organizationId", "status", "remindAt");
CREATE INDEX "ConversationReminder_conversationId_remindAt_idx" ON "ConversationReminder"("conversationId", "remindAt");
CREATE UNIQUE INDEX "FeatureFlag_organizationId_key_key" ON "FeatureFlag"("organizationId", "key");
CREATE INDEX "OutgoingWebhookEndpoint_organizationId_status_idx" ON "OutgoingWebhookEndpoint"("organizationId", "status");
CREATE INDEX "PartnerApiKey_organizationId_status_idx" ON "PartnerApiKey"("organizationId", "status");
CREATE INDEX "WeeklyDigest_organizationId_periodEnd_idx" ON "WeeklyDigest"("organizationId", "periodEnd");

ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConversationReminder" ADD CONSTRAINT "ConversationReminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutgoingWebhookEndpoint" ADD CONSTRAINT "OutgoingWebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerApiKey" ADD CONSTRAINT "PartnerApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeeklyDigest" ADD CONSTRAINT "WeeklyDigest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
