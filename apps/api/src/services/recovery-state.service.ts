import { prisma } from "../db/prisma";
import { RecoveryCaseStatus } from "@prisma/client";

const transitions: Record<
  RecoveryCaseStatus,
  RecoveryCaseStatus[]
> = {
  OPEN: [
    RecoveryCaseStatus.RETRYING,
    RecoveryCaseStatus.OUTREACH,
    RecoveryCaseStatus.MANUAL_REVIEW,
    RecoveryCaseStatus.ABANDONED,
  ],

  RETRYING: [
    RecoveryCaseStatus.OPEN,
    RecoveryCaseStatus.RECOVERED,
    RecoveryCaseStatus.EXHAUSTED,
    RecoveryCaseStatus.MANUAL_REVIEW,
  ],

  OUTREACH: [
    RecoveryCaseStatus.OPEN,
    RecoveryCaseStatus.RECOVERED,
    RecoveryCaseStatus.EXHAUSTED,
    RecoveryCaseStatus.MANUAL_REVIEW,
  ],

  RECOVERED: [],
  EXHAUSTED: [],
  MANUAL_REVIEW: [],
  ABANDONED: [],
};

export function canTransition(
  from: RecoveryCaseStatus,
  to: RecoveryCaseStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertValidTransition(
  from: RecoveryCaseStatus,
  to: RecoveryCaseStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid RecoveryCase transition: ${from} -> ${to}`,
    );
  }
}

export async function transitionRecoveryCase(
  caseId: string,
  nextStatus: RecoveryCaseStatus,
  actor = "system",
) {
  return prisma.$transaction(async (tx) => {
    const recoveryCase =
      await tx.recoveryCase.findUnique({
        where: { id: caseId },
      });

    if (!recoveryCase) {
      throw new Error(
        `RecoveryCase ${caseId} not found`,
      );
    }

    assertValidTransition(
      recoveryCase.status,
      nextStatus,
    );

    const updatedCase =
      await tx.recoveryCase.update({
        where: { id: caseId },
        data: {
          status: nextStatus,
        },
      });

    await tx.auditEvent.create({
      data: {
        caseId,
        stage: "STATE_TRANSITION",
        actor,
        input: {
          from: recoveryCase.status,
          to: nextStatus,
        },
        output: {
          status: updatedCase.status,
        },
      },
    });

    return updatedCase;
  });
}

export function getAllowedTransitions(
  status: RecoveryCaseStatus,
): RecoveryCaseStatus[] {
  return [...transitions[status]];
}

export async function markPaymentRecovered(
  paymentId: string,
  actor = "razorpay",
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
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

    /*
     * Payment may already have been captured.
     * This makes the service safe if it is called again.
     */
    if (payment.status === "CAPTURED") {
      return {
        payment,
        recoveryCase: payment.recoveryCase,
        alreadyRecovered: true,
      };
    }

    /*
     * A normal payment can succeed without having
     * gone through RecoverAI.
     *
     * In that case we only update the payment.
     */
    if (!payment.recoveryCase) {
      const updatedPayment =
        await tx.payment.update({
          where: {
            id: paymentId,
          },
          data: {
            status: "CAPTURED",
          },
        });

      return {
        payment: updatedPayment,
        recoveryCase: null,
        alreadyRecovered: false,
      };
    }

    const recoveryCase = payment.recoveryCase;

    /*
     * A recovery case can only become RECOVERED
     * from an active recovery state.
     */
    assertValidTransition(
      recoveryCase.status,
      RecoveryCaseStatus.RECOVERED,
    );

    const updatedPayment =
      await tx.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: "CAPTURED",
        },
      });

    const updatedCase =
      await tx.recoveryCase.update({
        where: {
          id: recoveryCase.id,
        },
        data: {
          status: RecoveryCaseStatus.RECOVERED,
          amountRecovered: payment.amount,
        },
      });

    /*
     * Record the actual financial recovery.
     */
    await tx.auditEvent.create({
      data: {
        caseId: recoveryCase.id,
        stage: "PAYMENT_CAPTURED",
        actor,
        input: {
          paymentId,
          paymentStatus: payment.status,
          amount: payment.amount,
          currency: payment.currency,
        },
        output: {
          paymentStatus: updatedPayment.status,
          recoveryStatus: updatedCase.status,
          amountRecovered:
            updatedCase.amountRecovered,
          currency: payment.currency,
        },
      },
    });

    /*
     * Record the state transition explicitly.
     */
    await tx.auditEvent.create({
      data: {
        caseId: recoveryCase.id,
        stage: "STATE_TRANSITION",
        actor,
        input: {
          from: recoveryCase.status,
          to: RecoveryCaseStatus.RECOVERED,
        },
        output: {
          status: updatedCase.status,
        },
      },
    });

    return {
      payment: updatedPayment,
      recoveryCase: updatedCase,
      alreadyRecovered: false,
    };
  });
}