-- PMS appointment sync tables. Column names intentionally use clinic_id to match
-- tenant-scoping contracts while Prisma maps them to organizationId in code.
CREATE TYPE "PmsProvider" AS ENUM ('jane_app', 'cliniko', 'mindbody');
CREATE TYPE "PmsConnectionStatus" AS ENUM ('active', 'pending', 'degraded', 'disconnected');
CREATE TYPE "PmsSyncDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "PmsSyncStatus" AS ENUM ('success', 'failed', 'skipped');

CREATE TABLE "pms_connections" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "provider" "PmsProvider" NOT NULL,
  "api_key_encrypted" TEXT NOT NULL,
  "last_synced_at" TIMESTAMP(3),
  "status" "PmsConnectionStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pms_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointments" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "pms_id" TEXT NOT NULL,
  "patient_name" TEXT NOT NULL,
  "patient_phone" TEXT,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_log" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "direction" "PmsSyncDirection" NOT NULL,
  "record_id" TEXT NOT NULL,
  "status" "PmsSyncStatus" NOT NULL,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pms_connections_clinic_id_provider_key"
  ON "pms_connections"("clinic_id", "provider");
CREATE INDEX "pms_connections_clinic_id_status_idx"
  ON "pms_connections"("clinic_id", "status");
CREATE INDEX "pms_connections_provider_status_idx"
  ON "pms_connections"("provider", "status");

CREATE UNIQUE INDEX "appointments_clinic_id_pms_id_key"
  ON "appointments"("clinic_id", "pms_id");
CREATE INDEX "appointments_clinic_id_start_at_idx"
  ON "appointments"("clinic_id", "start_at");
CREATE INDEX "appointments_clinic_id_status_start_at_idx"
  ON "appointments"("clinic_id", "status", "start_at");

CREATE INDEX "sync_log_clinic_id_created_at_idx"
  ON "sync_log"("clinic_id", "created_at");
CREATE INDEX "sync_log_clinic_id_status_created_at_idx"
  ON "sync_log"("clinic_id", "status", "created_at");

ALTER TABLE "pms_connections"
  ADD CONSTRAINT "pms_connections_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sync_log"
  ADD CONSTRAINT "sync_log_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
