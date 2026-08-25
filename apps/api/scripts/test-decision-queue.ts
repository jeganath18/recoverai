import "dotenv/config";

import { recoveryDecisionQueue } from "../src/queue/recovery.queue";

async function main() {
  const paymentId =
    "cmt2s7zar0000trkx02o50wu8";

  const job = await recoveryDecisionQueue.add(
    "payment-failed",
    {
      paymentId,
      failureReason:
        "Payment failed due to temporary network timeout",
      razorpayEventId:
        `test-event-${Date.now()}`,
    },
    {
      jobId: `test-decision-${Date.now()}`,
    },
  );

  console.log("Created job:", job.id);

  await recoveryDecisionQueue.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
