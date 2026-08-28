-- CreateTable
CREATE TABLE "public"."OutreachAttempt" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachAttempt_caseId_idx" ON "public"."OutreachAttempt"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachAttempt_caseId_attemptNumber_key" ON "public"."OutreachAttempt"("caseId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "public"."OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."RecoveryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
