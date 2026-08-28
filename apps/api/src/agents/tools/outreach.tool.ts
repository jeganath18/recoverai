import { prisma } from "../../db/prisma";

const MAX_OUTREACH_ATTEMPTS = 2;

export async function outreachTool(
  caseId: string,
  paymentId: string,
  attemptNumber: number,
) {
  if (attemptNumber > MAX_OUTREACH_ATTEMPTS) {
    throw new Error(
      "Maximum outreach attempts exceeded",
    );
  }

  const recoveryCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: caseId,
      },
    });

  if (!recoveryCase) {
    throw new Error(
      `Recovery case ${caseId} not found`,
    );
  }

  if (recoveryCase.paymentId !== paymentId) {
    throw new Error(
      "Payment does not belong to recovery case",
    );
  }

  if (recoveryCase.status !== "OUTREACH") {
    throw new Error(
      `Case is not in OUTREACH state: ${recoveryCase.status}`,
    );
  }

  if (
    recoveryCase.outreachAttempts >=
    MAX_OUTREACH_ATTEMPTS
  ) {
    throw new Error(
      "Maximum outreach attempts exceeded",
    );
  }

  const idempotencyKey =
    `outreach:${caseId}:${attemptNumber}`;

  const existing =
    await prisma.recoveryAttempt.findUnique({
      where: {
        idempotencyKey,
      },
    });

  if (existing) {
    return existing;
  }

  const attempt =
    await prisma.recoveryAttempt.create({
      data: {
        caseId,
        attemptNumber,
        action: "CUSTOMER_OUTREACH",
        status: "SENT",
        idempotencyKey,
        input: {
          paymentId,
        },
        output: {
          channel: "EMAIL_SIMULATION",
          message:
            "Your recent payment failed. Please retry your payment.",
          paymentAction: "PAY_NOW",
        },
      },
    });

  await prisma.recoveryCase.update({
    where: {
      id: caseId,
    },
    data: {
      outreachAttempts: {
        increment: 1,
      },
    },
  });

  await prisma.auditEvent.create({
    data: {
      caseId,
      stage: "CUSTOMER_OUTREACH",
      actor: "system",
      input: {
        paymentId,
        attemptNumber,
        channel: "EMAIL_SIMULATION",
      },
      output: {
        status: "SENT",
        recoveryAttemptId: attempt.id,
        message:
          "Your recent payment failed. Please retry your payment.",
      },
    },
  });

  return attempt;
}