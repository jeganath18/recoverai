import "dotenv/config";

import { retryExecutionQueue } from "../src/queue/recovery.queue";

const paymentId = "cmt7k0ubn0000try2kldneqwa";
const caseId = "cmt7k0ubr0002try2wch1y15t";

async function main() {
  const job = await retryExecutionQueue.add(
    "execute-retry",
    {
      paymentId,
      caseId,
      attemptNumber: 1,
    },
    {
      jobId: `retry-${caseId}-1`,
    },
  );

  console.log("Retry job created:");
  console.log({
    jobId: job.id,
    paymentId,
    caseId,
    attemptNumber: 1,
  });

  await retryExecutionQueue.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});