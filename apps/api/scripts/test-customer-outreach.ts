import { prisma } from "../src/db/prisma";
import { outreachTool } from "../src/agents/tools/outreach.tool";

async function main() {
  console.log("🧪 Creating Customer Outreach test case...\n");

  /*
   * 1. Create a fake failed payment.
   *
   * This is local test data only.
   * No real Razorpay payment is created here.
   */
  const payment = await prisma.payment.create({
    data: {
      razorpayId: `pay_test_outreach_${Date.now()}`,
      amount: 290000,
      currency: "INR",
      status: "FAILED",
      failureReason: "Insufficient funds",
    },
  });

  console.log("💳 Payment created:");
  console.log({
    id: payment.id,
    razorpayId: payment.razorpayId,
    amount: payment.amount,
    status: payment.status,
  });

  /*
   * 2. Create the recovery case.
   */
  const recoveryCase =
    await prisma.recoveryCase.create({
      data: {
        paymentId: payment.id,
        amountAtRisk: payment.amount,
        status: "OUTREACH",
        failureReason: "Insufficient funds",
        recommendedAction: "CUSTOMER_OUTREACH",
      },
    });

  console.log("\n📂 Recovery case created:");
  console.log({
    id: recoveryCase.id,
    status: recoveryCase.status,
    recommendedAction:
      recoveryCase.recommendedAction,
  });

  /*
   * 3. Execute the same outreach tool
   *    used by the Outreach Worker.
   */
  const attempt = await outreachTool(
    recoveryCase.id,
    payment.id,
    1,
  );

  console.log("\n📨 Outreach executed:");
  console.log({
    id: attempt.id,
    action: attempt.action,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    output: attempt.output,
  });

  /*
   * 4. Re-read everything from the DB.
   */
  const finalCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: recoveryCase.id,
      },
      include: {
        payment: true,
        attempts: true,
      },
    });

  console.log("\n✅ Final database state:");
  console.dir(finalCase, {
    depth: null,
  });
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Outreach test failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });