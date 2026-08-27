import { prisma } from "../../db/prisma";
import { razorpay } from "../../services/razorpay.service";

const MAX_RETRIES = 2;

export type RetryPaymentResult = {
  success: boolean;
  paymentId: string;
  amountRecovered: number;
  retryAttempts: number;
  attemptNumber: number;
  externalId?: string;
  reason?: string;
};

export async function retryPaymentTool(
  paymentId: string,
  attemptNumber: number,
): Promise<RetryPaymentResult> {
  /*
   * Re-read the database immediately before execution.
   * This protects against stale decisions / race conditions.
   */
  const payment =
    await prisma.payment.findUnique({
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

  const recoveryCase = payment.recoveryCase;

  if (!recoveryCase) {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts: 0,
      attemptNumber,
      reason:
        "No recovery case exists for this payment.",
    };
  }

  /*
   * Guard 1: payment must still be FAILED.
   */
  if (payment.status !== "FAILED") {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        recoveryCase.retryAttempts,
      attemptNumber,
      reason:
        `Payment is not FAILED. Current status: ${payment.status}`,
    };
  }

  /*
   * Guard 2: policy must have authorized retry.
   */
  if (
    recoveryCase.recommendedAction !==
    "RETRY_PAYMENT"
  ) {
    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        recoveryCase.retryAttempts,
      attemptNumber,
      reason:
        "Policy did not authorize payment retry.",
    };
  }

  /*
   * Guard 3: hard business retry limit.
   *
   * This is independent from BullMQ attempts.
   */
  if (
    recoveryCase.retryAttempts >= MAX_RETRIES
  ) {
    await prisma.recoveryCase.update({
      where: {
        id: recoveryCase.id,
      },
      data: {
        status: "EXHAUSTED",
      },
    });

    return {
      success: false,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        recoveryCase.retryAttempts,
      attemptNumber,
      reason:
        "Maximum retry limit reached. Recovery exhausted.",
    };
  }

  /*
   * Business idempotency key.
   */
  const idempotencyKey =
    `retry:${recoveryCase.id}:${attemptNumber}`;

  /*
   * If this exact business attempt already exists,
   * do not execute Razorpay again.
   */
  const existingAttempt =
    await prisma.recoveryAttempt.findUnique({
      where: {
        idempotencyKey,
      },
    });

  if (existingAttempt) {
    return {
      success:
        existingAttempt.status === "SUCCEEDED",
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        recoveryCase.retryAttempts,
      attemptNumber,
      externalId:
        existingAttempt.externalId ??
        undefined,
      reason:
        "Retry attempt already processed.",
    };
  }

  /*
   * Reserve this business attempt.
   *
   * The UNIQUE idempotencyKey prevents another worker
   * from creating the same business attempt.
   */
  const attempt =
    await prisma.recoveryAttempt.create({
      data: {
        caseId: recoveryCase.id,
        attemptNumber,
        action: "RETRY_PAYMENT",
        status: "STARTED",
        idempotencyKey,
        input: {
          paymentId,
          attemptNumber,
        },
      },
    });

  /*
   * Increment business retry counter.
   */
  const updatedCase =
    await prisma.recoveryCase.update({
      where: {
        id: recoveryCase.id,
      },
      data: {
        retryAttempts: {
          increment: 1,
        },
        status: "RETRYING",
      },
    });

  try {
    /*
     * Create a Razorpay Test Mode order.
     *
     * Razorpay amount is already stored in the smallest
     * currency unit (paise for INR).
     */
    const order = await razorpay.orders.create({
      amount: payment.amount,
      currency: payment.currency,
      receipt: `recoverai-retry-${payment.id}-${attemptNumber}`,
      notes: {
        recoveryCaseId: recoveryCase.id,
        paymentId: payment.id,
        attemptNumber: String(attemptNumber),
      },
    });

    const localOrder = await prisma.order.create({
      data: {
        razorpayId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        customerId: payment.customerId,
      },
    });

    /*
     * Persist successful execution.
     *
     * This means the recovery ACTION was executed.
     * It does NOT mean the payment itself recovered yet.
     */
    await prisma.recoveryAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        status: "SUCCEEDED",
        externalId: order.id,
        output: {
          orderId: order.id,
          localOrderId: localOrder.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
        },
      },
    });

    await prisma.auditEvent.create({
      data: {
        caseId: recoveryCase.id,
        stage: "RETRY_EXECUTION",
        actor: "razorpay",
        input: {
          paymentId,
          attemptNumber,
          idempotencyKey,
        },
        output: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
        },
      },
    });

    return {
      success: true,
      paymentId,
      amountRecovered: 0,
      retryAttempts:
        updatedCase.retryAttempts,
      attemptNumber,
      externalId: order.id,
      reason:
        "Razorpay Test Mode recovery order created successfully.",
    };
  } catch (error) {
    /*
     * Execution failed.
     */
    await prisma.recoveryAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        status: "FAILED",
        output: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      },
    });

    await prisma.auditEvent.create({
      data: {
        caseId: recoveryCase.id,
        stage: "RETRY_EXECUTION",
        actor: "razorpay",
        input: {
          paymentId,
          attemptNumber,
          idempotencyKey,
        },
        output: {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      },
    });

    throw error;
  }
}