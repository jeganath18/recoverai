import { Job, Worker } from "bullmq";

import { redisConnection } from "../queue/connection";
import { retryPaymentTool } from "../agents/tools/retry-payment.tool";

type RetryExecutionJob = {
  caseId: string;
  paymentId: string;
  attemptNumber: number;
};

export const retryExecutionWorker =
  new Worker<RetryExecutionJob>(
    "retry-execution",
    async (job: Job<RetryExecutionJob>) => {
      const {
        paymentId,
        attemptNumber,
      } = job.data;

      console.log(
        `[RetryWorker] Processing ${paymentId}, attempt ${attemptNumber}`,
      );

      const result =
        await retryPaymentTool(
          paymentId,
          attemptNumber,
        );

      console.log(
        "[RetryWorker] Retry result:",
        result,
      );

      return result;
    },
    {
      connection: redisConnection,

      /*
       * Payment execution is intentionally low
       * concurrency.
       */
      concurrency: 1,

      /*
       * Infrastructure-level retries.
       *
       * These are NOT payment retry attempts.
       */
      limiter: {
        max: 2,
        duration: 1000,
      },
    },
  );

retryExecutionWorker.on(
  "completed",
  (job) => {
    console.log(
      `[RetryWorker] Job ${job.id} completed`,
    );
  },
);

retryExecutionWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `[RetryWorker] Job ${job?.id} failed:`,
      error,
    );
  },
);