import "dotenv/config";

import {
  analyzeFailedPayment,
} from "../src/ai/recovery-agent";

async function main() {
  console.log(
    "Testing RecoverAI AI Recovery Agent...\n",
  );

  const decision =
    await analyzeFailedPayment({
      amount: 250000,
      currency: "INR",
      failureReason:
        "Payment failed due to insufficient funds",
      previousAttempts: 0,
    });

  console.log(
    JSON.stringify(decision, null, 2),
  );
}

main().catch((error) => {
  console.error("\nAI agent failed:");
  console.error(error);

  process.exit(1);
});