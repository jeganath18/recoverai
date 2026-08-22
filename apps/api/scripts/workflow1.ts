import "dotenv/config";

import { processFailedPayment } from "../src/services/recovery.service";

async function main() {
  const paymentId = "cmt2s7zar0000trkx02o50wu8";

  const result = await processFailedPayment(
    paymentId,
    "Payment failed due to temporary network timeout",
  );

  console.log(
    JSON.stringify(result, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});