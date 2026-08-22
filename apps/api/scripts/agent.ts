import "dotenv/config";

import {
  runRecoveryAgent,
} from "../src/agents/recovery-agent";

async function main() {
  console.log(
    "\n================================",
  );

  console.log(
    "       RecoverAI Agent Test",
  );

  console.log(
    "================================\n",
  );

  const result =
    await runRecoveryAgent({
      amount: 250000,
      currency: "INR",
      failureReason:
        "Payment failed due to a temporary network timeout",
      previousAttempts: 0,
    });

  console.log(
    JSON.stringify(result, null, 2),
  );

  console.log(
    "\n================================",
  );

  console.log(
    `Final action: ${result.policy.action}`,
  );

  console.log(
    `Allowed: ${result.policy.allowed}`,
  );

  console.log(
    `Reason: ${result.policy.reason}`,
  );

  console.log(
    "================================\n",
  );
}

main().catch((error) => {
  console.error(
    "\nRecovery agent failed:",
  );

  console.error(error);

  process.exit(1);
});