-- CreateEnum
CREATE TYPE "public"."RecoveryCaseStatus" AS ENUM (
    'OPEN',
    'RETRYING',
    'OUTREACH',
    'RECOVERED',
    'EXHAUSTED',
    'MANUAL_REVIEW',
    'ABANDONED'
);

-- Add nullable Razorpay event ID first
ALTER TABLE "public"."PaymentEvent"
ADD COLUMN "razorpayEventId" TEXT;

-- Backfill existing webhook events
UPDATE "public"."PaymentEvent"
SET "razorpayEventId" = 'legacy_' || "id"
WHERE "razorpayEventId" IS NULL;

-- Make the field mandatory for all future events
ALTER TABLE "public"."PaymentEvent"
ALTER COLUMN "razorpayEventId" SET NOT NULL;

-- Make Razorpay event IDs idempotent
CREATE UNIQUE INDEX "PaymentEvent_razorpayEventId_key"
ON "public"."PaymentEvent"("razorpayEventId");

-- Add outreach attempt tracking
ALTER TABLE "public"."RecoveryCase"
ADD COLUMN "outreachAttempts" INTEGER NOT NULL DEFAULT 0;

-- Convert existing RecoveryCase status from TEXT to enum
ALTER TABLE "public"."RecoveryCase"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."RecoveryCase"
ALTER COLUMN "status"
TYPE "public"."RecoveryCaseStatus"
USING "status"::text::"public"."RecoveryCaseStatus";

ALTER TABLE "public"."RecoveryCase"
ALTER COLUMN "status"
SET DEFAULT 'OPEN';

-- Add status index
CREATE INDEX "RecoveryCase_status_idx"
ON "public"."RecoveryCase"("status");

-- Create RecoveryAttempt
CREATE TABLE "public"."RecoveryAttempt" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "externalId" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryAttempt_pkey"
        PRIMARY KEY ("id")
);

-- RecoveryAttempt indexes
CREATE UNIQUE INDEX "RecoveryAttempt_idempotencyKey_key"
ON "public"."RecoveryAttempt"("idempotencyKey");

CREATE UNIQUE INDEX "RecoveryAttempt_caseId_attemptNumber_key"
ON "public"."RecoveryAttempt"("caseId", "attemptNumber");

CREATE INDEX "RecoveryAttempt_caseId_idx"
ON "public"."RecoveryAttempt"("caseId");

CREATE INDEX "RecoveryAttempt_action_idx"
ON "public"."RecoveryAttempt"("action");

-- RecoveryAttempt foreign key
ALTER TABLE "public"."RecoveryAttempt"
ADD CONSTRAINT "RecoveryAttempt_caseId_fkey"
FOREIGN KEY ("caseId")
REFERENCES "public"."RecoveryCase"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Create AuditEvent
CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "stage" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey"
        PRIMARY KEY ("id")
);

-- AuditEvent indexes
CREATE INDEX "AuditEvent_caseId_idx"
ON "public"."AuditEvent"("caseId");

CREATE INDEX "AuditEvent_stage_idx"
ON "public"."AuditEvent"("stage");

CREATE INDEX "AuditEvent_actor_idx"
ON "public"."AuditEvent"("actor");

-- AuditEvent foreign key
ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_caseId_fkey"
FOREIGN KEY ("caseId")
REFERENCES "public"."RecoveryCase"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
