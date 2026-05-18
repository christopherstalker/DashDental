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

CREATE UNIQUE INDEX "TeamInviteToken_tokenHash_key" ON "TeamInviteToken"("tokenHash");
CREATE INDEX "TeamInviteToken_membershipId_idx" ON "TeamInviteToken"("membershipId");
CREATE INDEX "TeamInviteToken_organizationId_email_idx" ON "TeamInviteToken"("organizationId", "email");
CREATE INDEX "TeamInviteToken_expiresAt_idx" ON "TeamInviteToken"("expiresAt");
