import { Job, Worker } from "bullmq";
import { RecoveryCaseStatus } from "@prisma/client";

import { prisma } from "../db/prisma";
import { redisConnection } from "../queue/connection";
import {
    retryExecutionQueue,
    outreachExecutionQueue,
} from "../queue/recovery.queue";

import { buildRecoveryContext } from "../services/audit.service";
import { runRecoveryAgent } from "../agents/recovery-agent";
import { transitionRecoveryCase } from "../services/recovery-state.service";

type RecoveryDecisionJob = {
    paymentId: string;
    failureReason: string;
    razorpayEventId: string;
};

export const recoveryDecisionWorker =
    new Worker<RecoveryDecisionJob>(
        "recovery-decision",
        async (job: Job<RecoveryDecisionJob>) => {
            const {
                paymentId,
                failureReason,
                razorpayEventId,
            } = job.data;

            console.log(
                `[DecisionWorker] Processing ${paymentId}`,
            );

            /*
             * 1. Make sure the payment exists.
             */
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

            /*
             * 2. Make sure a RecoveryCase exists.
             *
             * This is idempotent because paymentId is UNIQUE
             * on RecoveryCase.
             */
            let recoveryCase =
                await prisma.recoveryCase.findUnique({
                    where: {
                        paymentId,
                    },
                });

            if (!recoveryCase) {
                recoveryCase =
                    await prisma.recoveryCase.create({
                        data: {
                            paymentId,
                            amountAtRisk: payment.amount,
                            status: RecoveryCaseStatus.OPEN,
                            failureReason,
                        },
                    });
            }

            /*
             * 3. Build recovery context.
             */
            const context =
                await buildRecoveryContext(paymentId);

            /*
             * 4. Fail closed if the case is already terminal.
             */
            const terminalStatuses: RecoveryCaseStatus[] = [
                RecoveryCaseStatus.RECOVERED,
                RecoveryCaseStatus.EXHAUSTED,
                RecoveryCaseStatus.MANUAL_REVIEW,
                RecoveryCaseStatus.ABANDONED,
            ];

            if (
                terminalStatuses.includes(
                    recoveryCase.status,
                )
            ) {
                console.log(
                    `[DecisionWorker] Case ${recoveryCase.id} is terminal: ${recoveryCase.status}`,
                );

                return {
                    skipped: true,
                    reason: "CASE_TERMINAL",
                    status: recoveryCase.status,
                };
            }

            /*
             * 5. Run AI + policy.
             */
            const agentResult =
                await runRecoveryAgent({
                    amount: context.payment.amount,
                    currency: context.payment.currency,
                    failureReason,
                    previousAttempts:
                        context.history.previousRecoveryAttempts,
                });

            /*
             * 6. Audit AI decision.
             */
            await prisma.auditEvent.create({
                data: {
                    caseId: recoveryCase.id,
                    stage: "AI_DECISION",
                    actor: "ai",
                    input: {
                        paymentId,
                        razorpayEventId,
                        context,
                    },
                    output: {
                        diagnosis: agentResult.diagnosis,
                        recommendation:
                            agentResult.recommendation,
                    },
                },
            });

            /*
             * 7. Audit policy decision.
             */
            await prisma.auditEvent.create({
                data: {
                    caseId: recoveryCase.id,
                    stage: "POLICY_DECISION",
                    actor: "policy",
                    input: {
                        recommendation:
                            agentResult.recommendation,
                        amount: context.payment.amount,
                    },
                    output: agentResult.policy,
                },
            });

            /*
             * 8. Policy blocked → manual review.
             */
            if (!agentResult.policy.allowed) {
                await transitionRecoveryCase(
                    recoveryCase.id,
                    RecoveryCaseStatus.MANUAL_REVIEW,
                    "policy",
                );

                return {
                    action: "STOP_AND_REVIEW",
                    allowed: false,
                };
            }

            /*
             * 9. RETRY.
             */
            if (
                agentResult.policy.action ===
                "RETRY_PAYMENT"
            ) {
                await transitionRecoveryCase(
                    recoveryCase.id,
                    RecoveryCaseStatus.RETRYING,
                    "policy",
                );

                const nextAttempt =
                    recoveryCase.retryAttempts + 1;

                await retryExecutionQueue.add(
                    "execute-retry",
                    {
                        caseId: recoveryCase.id,
                        paymentId,
                        attemptNumber: nextAttempt,
                    },
                    {
                        jobId: `retry-${recoveryCase.id}-${nextAttempt}`,
                    },
                );

                return {
                    action: "RETRY_PAYMENT",
                    allowed: true,
                    attemptNumber: nextAttempt,
                };
            }

            /*
             * 10. OUTREACH.
             */
            if (
                agentResult.policy.action ===
                "CUSTOMER_OUTREACH"
            ) {
                await transitionRecoveryCase(
                    recoveryCase.id,
                    RecoveryCaseStatus.OUTREACH,
                    "policy",
                );

                const nextAttempt =
                    recoveryCase.outreachAttempts + 1;

                await outreachExecutionQueue.add(
                    "execute-outreach",
                    {
                        caseId: recoveryCase.id,
                        paymentId,
                        attemptNumber: nextAttempt,
                    },
                    {
                        jobId: `outreach-${recoveryCase.id}-${nextAttempt}`,
                    },
                );

                return {
                    action: "CUSTOMER_OUTREACH",
                    allowed: true,
                    attemptNumber: nextAttempt,
                };
            }

            /*
             * 11. Unknown action → fail closed.
             */
            await transitionRecoveryCase(
                recoveryCase.id,
                RecoveryCaseStatus.MANUAL_REVIEW,
                "policy",
            );

            return {
                action: "STOP_AND_REVIEW",
                allowed: false,
            };
        },
        {
            connection: redisConnection,

            /*
             * Decision jobs are safe to run concurrently
             * because they don't execute payments themselves.
             */
            concurrency: 5,
        },
    );

recoveryDecisionWorker.on(
    "completed",
    (job) => {
        console.log(
            `[DecisionWorker] Job ${job.id} completed`,
        );
    },
);

recoveryDecisionWorker.on(
    "failed",
    (job, error) => {
        console.error(
            `[DecisionWorker] Job ${job?.id} failed:`,
            error,
        );
    },
);