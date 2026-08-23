import "dotenv/config";

import { Worker } from "bullmq";
import IORedis from "ioredis";

import { processFailedPayment } from "../services/recovery.service";
import { retryPaymentTool } from "../agents/tools/retry-payment.tool";

const connection = new IORedis(
    process.env.REDIS_URL || "redis://localhost:6379",
    {
        maxRetriesPerRequest: null,
    },
);

const worker = new Worker(
    "recovery",
    async (job) => {
        const {
            paymentId,
            failureReason,
        } = job.data;

        console.log(
            `[RecoveryWorker] Processing ${paymentId}`,
        );

        const result =
            await processFailedPayment(
                paymentId,
                failureReason,
            );

        if (result.action === "RETRY_PAYMENT") {
            const retryResult =
                await retryPaymentTool(paymentId);

            console.log(
                "[RecoveryWorker] Retry result:",
                retryResult,
            );

            return {
                ...result,
                retryResult,
            };
        }
    },
    {
        connection,
        concurrency: 2,
    },
);

worker.on("completed", (job) => {
    console.log(
        `[RecoveryWorker] Job ${job.id} completed`,
    );
});

worker.on("failed", (job, error) => {
    console.error(
        `[RecoveryWorker] Job ${job?.id} failed:`,
        error,
    );
});

console.log(
    "RecoverAI recovery worker started",
);