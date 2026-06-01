-- AlterEnum
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'phone';

-- AlterEnum
ALTER TYPE "WebhookProvider" ADD VALUE IF NOT EXISTS 'twilio';
