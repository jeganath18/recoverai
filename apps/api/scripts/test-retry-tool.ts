import "dotenv/config";

import {
  retryPaymentTool,
} from "../src/agents/tools/retry-payment.tool";

async function main() {
  const paymentId =
    "cmt5dpm720004trosd15hr8e3";

  const result =
    await retryPaymentTool(paymentId);

  console.log(
    JSON.stringify(result, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});