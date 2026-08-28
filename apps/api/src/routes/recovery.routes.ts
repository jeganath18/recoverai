import { FastifyInstance } from "fastify";
import { getRecoveryMetrics } from "../services/recovery-metrics.service"
import { prisma } from "../db/prisma";
import { razorpay } from "../services/razorpay.service";
import { sendCustomerOutreach } from "../services/customer-outreach.service";

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
            order: true
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
            status: "MANUAL_REVIEW",
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
          status: "RETRYING",
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

  // Metrics Routes
  app.get(
    "/recovery/metrics",
    async () => {
      return getRecoveryMetrics();
    },
  );

  app.get(
    "/recovery/cases",
    async (request, reply) => {
      const cases = await prisma.recoveryCase.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          payment: true,
        },
      });

      return {
        cases,
      };
    },
  );

  app.get(
    "/recovery/cases/:id",
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const recoveryCase =
        await prisma.recoveryCase.findUnique({
          where: {
            id,
          },
          include: {
            payment: true,
            attempts: {
              orderBy: {
                createdAt: "asc",
              },
            },
            audits: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!recoveryCase) {
        return reply.code(404).send({
          error: "Recovery case not found",
        });
      }

      return {
        case: recoveryCase,
      };
    },
  );

  // Batch recovery route

  app.get(
    "/recovery/batch",
    async () => {
      const cases =
        await prisma.recoveryCase.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            payment: true,
            attempts: {
              orderBy: {
                attemptNumber: "asc",
              },
            },
          },
        });

      const totalCases = cases.length;

      const recoveredCases = cases.filter(
        (item) => item.status === "RECOVERED",
      ).length;

      const amountAtRisk = cases.reduce(
        (sum, item) => sum + item.amountAtRisk,
        0,
      );

      const amountRecovered = cases.reduce(
        (sum, item) =>
          sum + item.amountRecovered,
        0,
      );

      const totalAttempts = cases.reduce(
        (sum, item) =>
          sum + item.attempts.length,
        0,
      );

      const successfulAttempts =
        cases.reduce(
          (sum, item) =>
            sum +
            item.attempts.filter(
              (attempt) =>
                attempt.status ===
                "SUCCEEDED",
            ).length,
          0,
        );

      return {
        batch: {
          totalCases,
          recoveredCases,
          amountAtRisk,
          amountRecovered,
          amountOutstanding:
            amountAtRisk -
            amountRecovered,
          recoveryRate:
            totalCases === 0
              ? 0
              : recoveredCases /
              totalCases,
          revenueRecoveryRate:
            amountAtRisk === 0
              ? 0
              : amountRecovered /
              amountAtRisk,
          totalAttempts,
          successfulAttempts,
        },

        cases: cases.map((item) => ({
          id: item.id,
          status: item.status,
          amountAtRisk:
            item.amountAtRisk,
          amountRecovered:
            item.amountRecovered,
          failureReason:
            item.failureReason,
          recommendedAction:
            item.recommendedAction,
          retryAttempts:
            item.retryAttempts,
          outreachAttempts:
            item.outreachAttempts,
          payment: {
            id: item.payment.id,
            razorpayId:
              item.payment.razorpayId,
            status:
              item.payment.status,
            amount:
              item.payment.amount,
            currency:
              item.payment.currency,
          },
          attempts:
            item.attempts.map(
              (attempt) => ({
                attemptNumber:
                  attempt.attemptNumber,
                action: attempt.action,
                status: attempt.status,
                externalId:
                  attempt.externalId,
              }),
            ),
        })),
      };
    },
  );

  // Policy routes
  app.get("/recovery/policy", async () => {
    return {
      retry: {
        enabled: true,
        maxRetries: 2,
        minimumConfidence: 0.75,
        maximumAutoRetryAmount: 1_000_000,
        maximumAutoRetryAmountINR: 10_000,
      },

      fraud: {
        automaticRecovery: false,
        action: "STOP_AND_REVIEW",
      },

      escalation: {
        action: "STOP_AND_REVIEW",
        exhaustedRetries: "MANUAL_REVIEW",
        highValuePayment: "MANUAL_REVIEW",
        lowConfidence: "MANUAL_REVIEW",
        fraudRisk: "MANUAL_REVIEW",
      },

      financialConfirmation: {
        paymentCaptureRequired: true,
        reconciliationRequired: true,
      },

      idempotency: {
        enabled: true,
        strategy: "case + attempt number",
      },

      terminalStates: [
        "RECOVERED",
        "EXHAUSTED",
        "MANUAL_REVIEW",
        "ABANDONED",
      ],
    };
  });

  app.get(
    "/recovery/cases/:caseId/timeline",
    async (request, reply) => {
      const { caseId } = request.params as {
        caseId: string;
      };

      const recoveryCase =
        await prisma.recoveryCase.findUnique({
          where: {
            id: caseId,
          },
          include: {
            payment: true,
            attempts: {
              orderBy: {
                createdAt: "asc",
              },
            },
            audits: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!recoveryCase) {
        return reply.code(404).send({
          error: "Recovery case not found",
        });
      }

      return {
        case: {
          id: recoveryCase.id,
          status: recoveryCase.status,
          amountAtRisk: recoveryCase.amountAtRisk,
          amountRecovered: recoveryCase.amountRecovered,
          failureReason: recoveryCase.failureReason,
          recommendedAction:
            recoveryCase.recommendedAction,
          retryAttempts:
            recoveryCase.retryAttempts,
        },

        payment: {
          id: recoveryCase.payment.id,
          razorpayId:
            recoveryCase.payment.razorpayId,
          status: recoveryCase.payment.status,
          amount: recoveryCase.payment.amount,
          currency: recoveryCase.payment.currency,
        },

        attempts: recoveryCase.attempts,

        audits: recoveryCase.audits,
      };
    },
  );

  app.post(
    "/recovery/cases/:caseId/outreach",
    async (request, reply) => {
      const { caseId } =
        request.params as {
          caseId: string;
        };

      const body =
        (request.body as {
          channel?: "EMAIL" | "SMS" | "WHATSAPP";
        }) ?? {};

      const channel =
        body.channel ?? "EMAIL";

      const recoveryCase =
        await prisma.recoveryCase.findUnique({
          where: {
            id: caseId,
          },
        });

      if (!recoveryCase) {
        return reply.code(404).send({
          error: "Recovery case not found",
        });
      }

      if (
        recoveryCase.recommendedAction !==
        "CUSTOMER_OUTREACH"
      ) {
        return reply.code(403).send({
          error:
            "Customer outreach was not authorized by the recovery policy",
        });
      }

      const result =
        await sendCustomerOutreach(
          caseId,
          channel,
        );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    },
  );

  app.post(
    "/recovery/cases/:caseId/outreach/pay",
    async (request, reply) => {
      const { caseId } =
        request.params as {
          caseId: string;
        };

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
        return reply.code(404).send({
          error: "Recovery case not found",
        });
      }

      if (recoveryCase.status !== "OUTREACH") {
        return reply.code(400).send({
          error:
            "Payment recovery is not currently available for this case",
        });
      }

      if (
        recoveryCase.recommendedAction !==
        "CUSTOMER_OUTREACH"
      ) {
        return reply.code(403).send({
          error:
            "Customer outreach was not authorized by the recovery policy",
        });
      }

      /*
       * Find the most recent outreach attempt.
       *
       * This attempt represents the customer outreach
       * that generated the payment opportunity.
       */
      const outreachAttempt =
        await prisma.recoveryAttempt.findFirst({
          where: {
            caseId,
            action: "CUSTOMER_OUTREACH",
          },
          orderBy: {
            attemptNumber: "desc",
          },
        });

      if (!outreachAttempt) {
        return reply.code(400).send({
          error:
            "No customer outreach attempt exists for this recovery case",
        });
      }

      /*
       * Create the Razorpay recovery order.
       */
      const order =
        await razorpay.orders.create({
          amount: recoveryCase.amountAtRisk,
          currency: recoveryCase.payment.currency,
          receipt: `outreach_${caseId}_${Date.now()}`,
        });

      const localOrder =
        await prisma.order.create({
          data: {
            razorpayId: order.id,
            amount: Number(order.amount),
            currency: order.currency,
            status: order.status,
            customerId: recoveryCase.payment.customerId,
          },
        });

      /*
       * Connect the Razorpay order to the recovery attempt.
       *
       * Reconciliation uses this externalId to determine
       * which recovery case the captured payment belongs to.
       */
      const updatedAttempt =
        await prisma.recoveryAttempt.update({
          where: {
            id: outreachAttempt.id,
          },
          data: {
            externalId: order.id,
            status: "PAYMENT_PENDING",
            output: {
              channel: "EMAIL_SIMULATION",
              message:
                "Your recent payment failed. Please retry your payment.",
              paymentAction: "PAY_NOW",
              razorpayOrderId: order.id,
              localOrderId: localOrder.id,
            },
          },
        });

      await prisma.auditEvent.create({
        data: {
          caseId,
          stage: "RECOVERY_PAYMENT_CREATED",
          actor: "razorpay",
          input: {
            recoveryAttemptId: outreachAttempt.id,
            amount: recoveryCase.amountAtRisk,
            currency: recoveryCase.payment.currency,
          },
          output: {
            razorpayOrderId: order.id,
            recoveryAttemptId: updatedAttempt.id,
          },
        },
      });

      return reply.code(201).send({
        caseId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        recoveryAttemptId: updatedAttempt.id,
        localOrderId: localOrder.id,
      });
    },
  );


}