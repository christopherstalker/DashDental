-- Add server-side API key hashes. Raw partner API keys are only returned once at creation.
ALTER TABLE "PartnerApiKey" ADD COLUMN "keyHash" TEXT NOT NULL DEFAULT '';

-- Add privileged MFA storage. TOTP secrets are encrypted by the app before persistence.
ALTER TABLE "UserCredential" ADD COLUMN "totpSecretEncrypted" TEXT;
ALTER TABLE "UserCredential" ADD COLUMN "totpEnabledAt" TIMESTAMP(3);
ALTER TABLE "UserCredential" ADD COLUMN "mfaRecoveryCodesJson" JSONB;

CREATE INDEX "UserCredential_totpEnabledAt_idx" ON "UserCredential"("totpEnabledAt");
