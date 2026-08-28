import { prisma } from "../db/prisma";

export async function reconcileCapturedPayment(
    paymentId: string,
    razorpayEventId: string,
) {
    const payment = await prisma.payment.findUnique({
        where: {
            id: paymentId,
        },
        include: {
            order: true,
        },
    });

    if (!payment) {
        throw new Error(
            `Payment ${paymentId} not found`,
        );
    }

    if (!payment.order) {
        throw new Error(
            `Payment ${paymentId} has no associated order`,
        );
    }

    /*
     * Find the recovery attempt that created this
     * Razorpay recovery order.
     */
    const recoveryAttempt =
        await prisma.recoveryAttempt.findFirst({
            where: {
                externalId: payment.order.razorpayId,
                action: {
                    in: [
                        "RETRY_PAYMENT",
                        "CUSTOMER_OUTREACH",
                    ],
                },
                status: {
                    in: [
                        "SUCCEEDED",
                        "PAYMENT_PENDING",
                    ],
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                recoveryCase: true,
            },
        });

    /*
     * This is a normal payment, not a recovery payment.
     */
    if (!recoveryAttempt) {
        return {
            payment,
            recoveryCase: null,
            alreadyRecovered: false,
            reason:
                "No recovery attempt found for this order.",
        };
    }

    const recoveryCase =
        recoveryAttempt.recoveryCase;

    const result = await prisma.$transaction(
        async (tx) => {
            /*
             * Idempotency:
             *
             * If this webhook is delivered again after the
             * recovery case has already been recovered, do
             * not execute the recovery again.
             */
            if (
                recoveryCase.status === "RECOVERED"
            ) {
                const capturedPayment =
                    payment.status === "CAPTURED"
                        ? payment
                        : await tx.payment.update({
                            where: {
                                id: payment.id,
                            },
                            data: {
                                status: "CAPTURED",
                            },
                        });

                return {
                    payment: capturedPayment,
                    recoveryCase,
                    alreadyRecovered: true,
                };
            }

            /*
             * ------------------------------------------------
             * 1. Mark the ACTUAL recovery payment CAPTURED.
             * ------------------------------------------------
             *
             * This is the new Razorpay payment created when
             * the customer paid the recovery order.
             */
            const updatedCapturedPayment =
                await tx.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: "CAPTURED",
                    },
                });

            /*
             * ------------------------------------------------
             * 2. Find the ORIGINAL failed payment.
             * ------------------------------------------------
             */
            const originalPayment =
                await tx.payment.findUnique({
                    where: {
                        id: recoveryCase.paymentId,
                    },
                });

            if (!originalPayment) {
                throw new Error(
                    `Original payment ${recoveryCase.paymentId} not found`,
                );
            }

            /*
             * ------------------------------------------------
             * 3. Keep the original payment FAILED.
             * ------------------------------------------------
             *
             * Important:
             *
             * The original Razorpay payment really failed.
             * The NEW recovery payment is what succeeded.
             *
             * Therefore we should NOT change:
             *
             * originalPayment.status → CAPTURED
             *
             * The RecoveryCase records the business recovery.
             */

            /*
             * ------------------------------------------------
             * 4. Mark RecoveryCase RECOVERED.
             * ------------------------------------------------
             */
            const updatedCase =
                await tx.recoveryCase.update({
                    where: {
                        id: recoveryCase.id,
                    },
                    data: {
                        status: "RECOVERED",
                        amountRecovered:
                            updatedCapturedPayment.amount,
                    },
                });

            /*
             * ------------------------------------------------
             * 5. Audit reconciliation.
             * ------------------------------------------------
             */
            await tx.auditEvent.create({
                data: {
                    caseId: recoveryCase.id,
                    stage: "PAYMENT_RECONCILIATION",
                    actor: "razorpay",
                    input: {
                        capturedPaymentId:
                            updatedCapturedPayment.id,
                        capturedRazorpayPaymentId:
                            updatedCapturedPayment.razorpayId,
                        originalPaymentId:
                            originalPayment.id,
                        originalRazorpayPaymentId:
                            originalPayment.razorpayId,
                        orderId:
                            payment?.order?.razorpayId,
                        recoveryAttemptId:
                            recoveryAttempt.id,
                        razorpayEventId,
                    },
                    output: {
                        capturedPaymentStatus:
                            updatedCapturedPayment.status,
                        recoveryCaseId:
                            updatedCase.id,
                    },
                },
            });

            /*
             * ------------------------------------------------
             * 6. Audit actual financial recovery.
             * ------------------------------------------------
             */
            await tx.auditEvent.create({
                data: {
                    caseId: recoveryCase.id,
                    stage: "PAYMENT_CAPTURED",
                    actor: "razorpay",
                    input: {
                        paymentId:
                            updatedCapturedPayment.id,
                        razorpayPaymentId:
                            updatedCapturedPayment.razorpayId,
                        amount:
                            updatedCapturedPayment.amount,
                        currency:
                            updatedCapturedPayment.currency,
                        orderId:
                            payment?.order?.razorpayId,
                        razorpayEventId,
                    },
                    output: {
                        paymentStatus:
                            updatedCapturedPayment.status,
                        recoveryStatus:
                            updatedCase.status,
                        amountRecovered:
                            updatedCase.amountRecovered,
                        currency:
                            updatedCapturedPayment.currency,
                    },
                },
            });

            /*
             * ------------------------------------------------
             * 7. Audit state transition.
             * ------------------------------------------------
             */
            await tx.auditEvent.create({
                data: {
                    caseId: recoveryCase.id,
                    stage: "STATE_TRANSITION",
                    actor: "razorpay",
                    input: {
                        from: recoveryCase.status,
                        to: "RECOVERED",
                    },
                    output: {
                        status: updatedCase.status,
                    },
                },
            });

            return {
                payment: updatedCapturedPayment,
                recoveryCase: updatedCase,
                alreadyRecovered: false,
            };
        },
    );

    return result;
}