import "dotenv/config";

import { prisma } from "../src/db/prisma";

async function main() {
  // Create a fresh payment
  const payment = await prisma.payment.create({
    data: {
      razorpayId: `pay_test_${Date.now()}`,
      amount: 250000,
      currency: "INR",
      status: "FAILED",
      failureReason: "Temporary network timeout",
    },
  });

  // Create an OPEN recovery case authorized for retry
  const recoveryCase = await prisma.recoveryCase.create({
    data: {
      paymentId: payment.id,
      amountAtRisk: payment.amount,
      status: "OPEN",
      failureReason: payment.failureReason,
      recommendedAction: "RETRY_PAYMENT",
      retryAttempts: 0,
      outreachAttempts: 0,
    },
  });

  console.log("\n================================");
  console.log("Retry Test Data Created");
  console.log("================================");

  console.log({
    paymentId: payment.id,
    razorpayId: payment.razorpayId,
    amount: payment.amount,
    currency: payment.currency,
    paymentStatus: payment.status,
    recoveryCaseId: recoveryCase.id,
    recoveryCaseStatus: recoveryCase.status,
    recommendedAction: recoveryCase.recommendedAction,
    retryAttempts: recoveryCase.retryAttempts,
  });

  console.log("================================\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });