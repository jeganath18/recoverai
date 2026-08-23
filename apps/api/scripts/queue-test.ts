import "dotenv/config";

import { recoveryQueue } from "../src/queue/recovery.queue";

async function main() {
  const paymentId =
    "cmt2s7zar0000trkx02o50wu8";

  const job = await recoveryQueue.add(
    "payment-failed",
    {
      paymentId,
      failureReason:
        "Payment failed due to temporary network timeout",
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log(
    `Recovery job queued: ${job.id}`,
  );

  await recoveryQueue.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});