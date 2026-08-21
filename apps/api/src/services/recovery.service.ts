import { prisma } from "../db/prisma";

type RecoveryDecision = {
  recoverable: boolean;
  action: string;
};

function determineRecoveryAction(
  failureReason: string,
): RecoveryDecision {
  const reason = failureReason.toLowerCase();

  // Never automatically recover potentially fraudulent payments.
  if (
    reason.includes("fraud") ||
    reason.includes("suspected") ||
    reason.includes("stolen")
  ) {
    return {
      recoverable: false,
      action: "STOP_AND_REVIEW",
    };
  }

  // Temporary payment issues can usually be retried.
  if (
    reason.includes("network") ||
    reason.includes("timeout") ||
    reason.includes("temporary")
  ) {
    return {
      recoverable: true,
      action: "RETRY_PAYMENT",
    };
  }

  // Insufficient funds should not be retried immediately.
  if (
    reason.includes("insufficient") ||
    reason.includes("funds")
  ) {
    return {
      recoverable: true,
      action: "CUSTOMER_OUTREACH",
    };
  }

  // Unknown failures require a safe human/customer intervention.
  return {
    recoverable: true,
    action: "CUSTOMER_OUTREACH",
  };
}

export async function processFailedPayment(
  paymentId: string,
  failureReason: string,
) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
  });

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const decision = determineRecoveryAction(failureReason);

  // Update the payment itself.
  await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      status: "FAILED",
      failureReason,
    },
  });

  // Fraud/suspicious payments should not enter an automatic
  // recovery workflow.
  if (!decision.recoverable) {
    return {
      paymentId,
      recoverable: false,
      action: decision.action,
      recoveryCase: null,
    };
  }

  // Avoid creating duplicate recovery cases.
  const existingCase = await prisma.recoveryCase.findUnique({
    where: {
      paymentId,
    },
  });

  if (existingCase) {
    return {
      paymentId,
      recoverable: true,
      action: existingCase.recommendedAction,
      recoveryCase: existingCase,
    };
  }

  const recoveryCase = await prisma.recoveryCase.create({
    data: {
      paymentId,
      amountAtRisk: payment.amount,
      status: "OPEN",
      failureReason,
      recommendedAction: decision.action,
    },
  });

  return {
    paymentId,
    recoverable: true,
    action: decision.action,
    recoveryCase,
  };
}