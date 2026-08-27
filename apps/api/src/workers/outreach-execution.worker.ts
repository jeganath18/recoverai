import { Job, Worker } from "bullmq";
import { redisConnection } from "../queue/connection";
import { outreachTool } from "../agents/tools/outreach.tool";

type OutreachJob = {
  caseId: string;
  paymentId: string;
  attemptNumber: number;
};

export const outreachExecutionWorker =
  new Worker<OutreachJob>(
    "outreach-execution",
    async (job: Job<OutreachJob>) => {
      const {
        caseId,
        paymentId,
        attemptNumber,
      } = job.data;

      console.log(
        `[OutreachWorker] Processing ${paymentId}`,
      );

      return outreachTool(
        caseId,
        paymentId,
        attemptNumber,
      );
    },
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );

outreachExecutionWorker.on(
  "completed",
  (job) => {
    console.log(
      `[OutreachWorker] Job ${job.id} completed`,
    );
  },
);

outreachExecutionWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `[OutreachWorker] Job ${job?.id} failed:`,
      error,
    );
  },
);