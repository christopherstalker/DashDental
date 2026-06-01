-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('welcome', 'pms', 'phone', 'recall', 'invite', 'done');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "activated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "onboarding_progress" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "step" "OnboardingStep" NOT NULL,
  "completed_at" TIMESTAMP(3),
  "data" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT,
  "event" TEXT NOT NULL,
  "properties" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_clinic_id_step_key" ON "onboarding_progress"("clinic_id", "step");

-- CreateIndex
CREATE INDEX "onboarding_progress_clinic_id_completed_at_idx" ON "onboarding_progress"("clinic_id", "completed_at");

-- CreateIndex
CREATE INDEX "analytics_events_clinic_id_created_at_idx" ON "analytics_events"("clinic_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
