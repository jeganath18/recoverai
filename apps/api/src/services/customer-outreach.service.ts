import { prisma } from "../db/prisma";

const MAX_OUTREACH_ATTEMPTS = 2;

export type OutreachResult = {
  success: boolean;
  caseId: string;
  attemptNumber: number;
  channel: string;
  message: string;
  reason?: string;
};

export async function sendCustomerOutreach(
  caseId: string,
  channel: "EMAIL" | "SMS" | "WHATSAPP" = "EMAIL",
): Promise<OutreachResult> {
  const recoveryCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: caseId,
      },
      include: {
        payment: true,
      },
    });

  if (!recoveryCase) {
    throw new Error(
      `Recovery case ${caseId} not found`,
    );
  }

  if (
    recoveryCase.status !== "OUTREACH"
  ) {
    return {
      success: false,
      caseId,
      attemptNumber:
        recoveryCase.outreachAttempts,
      channel,
      message: "",
      reason:
        `Case is not in OUTREACH state. Current state: ${recoveryCase.status}`,
    };
  }

  if (
    recoveryCase.outreachAttempts >=
    MAX_OUTREACH_ATTEMPTS
  ) {
    return {
      success: false,
      caseId,
      attemptNumber:
        recoveryCase.outreachAttempts,
      channel,
      message: "",
      reason:
        "Maximum outreach attempts reached.",
    };
  }

  const attemptNumber =
    recoveryCase.outreachAttempts + 1;

  const message =
    `Your recent payment of ₹${(
      recoveryCase.amountAtRisk / 100
    ).toLocaleString("en-IN")} could not be completed. ` +
    `You can securely complete your payment through the recovery link.`;

  const attempt =
    await prisma.outreachAttempt.create({
      data: {
        caseId,
        attemptNumber,
        channel,
        status: "SENT",
        message,
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
        channel,
        attemptNumber,
      },
      output: {
        outreachAttemptId: attempt.id,
        status: "SENT",
        message,
      },
    },
  });

  return {
    success: true,
    caseId,
    attemptNumber,
    channel,
    message,
  };
}