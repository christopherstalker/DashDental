-- Additive inbox projection repair for existing production databases.
-- Safe to apply repeatedly; keeps old conversation projection rows readable.

ALTER TABLE "ConversationProjection"
  ADD COLUMN IF NOT EXISTS "lastMessagePreview" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ConversationProjection"
  ADD COLUMN IF NOT EXISTS "atRisk" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "ConversationProjection_organizationId_status_lastMessageAt_idx"
  ON "ConversationProjection"("organizationId", "status", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "ConversationProjection_organizationId_responseState_slaDeadlineAt_idx"
  ON "ConversationProjection"("organizationId", "responseState", "slaDeadlineAt");

CREATE INDEX IF NOT EXISTS "ConversationProjection_organizationId_assignedTo_lastMessageAt_idx"
  ON "ConversationProjection"("organizationId", "assignedTo", "lastMessageAt");
