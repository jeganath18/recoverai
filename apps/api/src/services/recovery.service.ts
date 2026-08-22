import { prisma } from "../db/prisma";
import { buildRecoveryContext } from "./audit.service";
import { runRecoveryAgent } from "../agents/recovery-agent";

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
    throw new Error(
      `Payment ${paymentId} not found`,
    );
  }

  // Persist the failure first.
  await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      status: "FAILED",
      failureReason,
    },
  });

  // Prevent duplicate recovery cases.
  const existingCase =
    await prisma.recoveryCase.findUnique({
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

  // Build context from PostgreSQL.
  const context =
    await buildRecoveryContext(paymentId);

  const previousAttempts =
    context.history.previousRecoveryAttempts;

  // Ask the AI agent for a recommendation.
  const agentResult =
    await runRecoveryAgent({
      amount: payment.amount,
      currency: payment.currency,
      failureReason,
      previousAttempts,
    });

  const policy = agentResult.policy;

  // Policy decides whether automatic recovery
  // is actually allowed.
  const recoveryCase =
    await prisma.recoveryCase.create({
      data: {
        paymentId,
        amountAtRisk: payment.amount,
        status: policy.allowed
          ? "OPEN"
          : "REVIEW_REQUIRED",
        failureReason,
        recommendedAction: policy.action,
      },
    });

  return {
    paymentId,
    recoverable: policy.allowed,
    action: policy.action,
    recoveryCase,
    diagnosis: agentResult.diagnosis,
    recommendation: agentResult.recommendation,
    policy,
  };
}