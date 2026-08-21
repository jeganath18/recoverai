import "dotenv/config";

import { buildRecoveryContext } from "../src/services/audit.service";

async function main() {
  const paymentId = "cmt2s7zar0000trkx02o50wu8";

  const context =
    await buildRecoveryContext(paymentId);

  console.log(
    JSON.stringify(context, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});