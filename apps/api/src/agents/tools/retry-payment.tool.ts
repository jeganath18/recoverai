import { prisma } from "../../db/prisma";

const MAX_RETRIES = 2;

export type RetryPaymentResult = {
  success: boolean;
  paymentId: string;
  amountRecovered: number;
  retryAttempts: number;
  reason?: string;
};

export async function retryPaymentTool(
  paymentId: string,
): Promise<RetryPaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      recoveryCase: true,
    },
  });

  if (!payment) {
    throw new Error(
      `Payment ${paymentId} not found`,
    );
  }

  if (payment.status !== "FAILED") {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        payment.recoveryCase?.retryAttempts ?? 0,
      reason:
        `Payment is not FAILED. Current status: ${payment.status}`,
    };
  }

  if (!payment.recoveryCase) {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts: 0,
      reason:
        "No recovery case exists for this payment.",
    };
  }

  if (
    payment.recoveryCase.recommendedAction !==
    "RETRY_PAYMENT"
  ) {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        payment.recoveryCase.retryAttempts,
      reason:
        "Policy did not authorize payment retry.",
    };
  }

  const currentAttempts =
    payment.recoveryCase.retryAttempts;

  if (currentAttempts >= MAX_RETRIES) {
    await prisma.recoveryCase.update({
      where: {
        paymentId,
      },
      data: {
        status: "MANUAL_REVIEW",
      },
    });

    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts: currentAttempts,
      reason:
        "Maximum retry limit reached. Manual review required.",
    };
  }

  const updatedCase =
    await prisma.recoveryCase.update({
      where: {
        paymentId,
      },
      data: {
        retryAttempts: {
          increment: 1,
        },
        status: "RETRYING",
      },
    });

  return {
    success: true,
    paymentId,
    amountRecovered: 0,
    retryAttempts:
      updatedCase.retryAttempts,
    reason:
      "Recovery retry attempt created successfully.",
  };
}