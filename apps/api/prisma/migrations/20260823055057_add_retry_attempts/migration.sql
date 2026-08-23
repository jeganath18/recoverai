-- AlterTable
ALTER TABLE "public"."RecoveryCase" ADD COLUMN     "retryAttempts" INTEGER NOT NULL DEFAULT 0;
