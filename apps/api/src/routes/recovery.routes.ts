import { FastifyInstance } from "fastify";

import { prisma } from "../db/prisma";
import { razorpay } from "../services/razorpay.service";

const MAX_RETRIES = 2;

export async function recoveryRoutes(
  app: FastifyInstance,
) {
  app.post(
    "/recovery/:paymentId/retry",
    async (request, reply) => {
      const { paymentId } = request.params as {
        paymentId: string;
      };

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
        return reply.code(404).send({
          error: "Payment not found",
        });
      }

      if (payment.status !== "FAILED") {
        return reply.code(400).send({
          error: "Payment is not in FAILED state",
        });
      }

      if (!payment.recoveryCase) {
        return reply.code(400).send({
          error: "No recovery case exists",
        });
      }

      if (
        payment.recoveryCase
          .recommendedAction !== "RETRY_PAYMENT"
      ) {
        return reply.code(403).send({
          error:
            "Retry was not authorized by the recovery policy",
        });
      }

      if (
        payment.recoveryCase.retryAttempts >=
        MAX_RETRIES
      ) {
        await prisma.recoveryCase.update({
          where: {
            paymentId,
          },
          data: {
            status: "REVIEW_REQUIRED",
          },
        });

        return reply.code(403).send({
          error:
            "Maximum retry limit reached",
        });
      }

      const order =
        await razorpay.orders.create({
          amount: payment.amount,
          currency: payment.currency,
          receipt: `recovery_${payment.id}_${Date.now()}`,
        });

      await prisma.recoveryCase.update({
        where: {
          paymentId,
        },
        data: {
          retryAttempts: {
            increment: 1,
          },
          status: "RECOVERY_ATTEMPTED",
        },
      });

      return reply.code(201).send({
        recoveryPaymentId: payment.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        retryAttempts:
          payment.recoveryCase.retryAttempts + 1,
      });
    },
  );
}