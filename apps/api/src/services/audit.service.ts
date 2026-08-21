import { prisma } from "../db/prisma";

export async function buildRecoveryContext(
  paymentId: string,
) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    include: {
      customer: true,
      order: true,
      events: {
        orderBy: {
          receivedAt: "desc",
        },
      },
      recoveryCase: true,
    },
  });

  if (!payment) {
    throw new Error(
      `Payment ${paymentId} not found`,
    );
  }

  let successfulPayments = 0;
  let failedPayments = 0;
  let totalPaid = 0;

  if (payment.customerId) {
    const customerPayments =
      await prisma.payment.findMany({
        where: {
          customerId: payment.customerId,
        },

        select: {
          status: true,
          amount: true,
        },
      });

    for (const customerPayment of customerPayments) {
      if (customerPayment.status === "CAPTURED") {
        successfulPayments++;
        totalPaid += customerPayment.amount;
      }

      if (customerPayment.status === "FAILED") {
        failedPayments++;
      }
    }
  }

  const previousRecoveryAttempts =
    payment.recoveryCase
      ? 1
      : 0;

  const previousRecoveredAmount =
    payment.recoveryCase?.amountRecovered ?? 0;

  return {
    payment: {
      id: payment.id,
      razorpayId: payment.razorpayId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      failureReason: payment.failureReason,
    },

    customer: payment.customer
      ? {
          id: payment.customer.id,
          name: payment.customer.name,
          email: payment.customer.email,
          successfulPayments,
          failedPayments,
          totalPaid,
        }
      : null,

    order: payment.order
      ? {
          id: payment.order.id,
          amount: payment.order.amount,
          currency: payment.order.currency,
          status: payment.order.status,
        }
      : null,

    history: {
      previousRecoveryAttempts,
      previousRecoveredAmount,
    },
  };
}