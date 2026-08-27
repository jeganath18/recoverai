import { prisma } from "../../db/prisma";

const MAX_OUTREACH_ATTEMPTS = 2;

export async function outreachTool(
  caseId: string,
  paymentId: string,
  attemptNumber: number,
) {
  if (
    attemptNumber >
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

  return attempt;
}