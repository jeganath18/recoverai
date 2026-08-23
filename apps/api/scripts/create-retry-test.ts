import "dotenv/config";

import { prisma } from "../src/db/prisma";

async function main() {
  const customer = await prisma.customer.create({
    data: {
      name: "Retry Test Customer",
      email: `retry-${Date.now()}@example.com`,
    },
  });

  const order = await prisma.order.create({
    data: {
      razorpayId: `order_retry_${Date.now()}`,
      customerId: customer.id,
      amount: 250000,
      currency: "INR",
      status: "FAILED",
    },
  });

  const payment = await prisma.payment.create({
    data: {
      razorpayId: `pay_retry_${Date.now()}`,
      orderId: order.id,
      customerId: customer.id,
      amount: 250000,
      currency: "INR",
      status: "FAILED",
      failureReason:
        "Payment failed due to temporary network timeout",
    },
  });

  await prisma.recoveryCase.create({
    data: {
      paymentId: payment.id,
      amountAtRisk: payment.amount,
      status: "OPEN",
      failureReason:
        "Payment failed due to temporary network timeout",
      recommendedAction: "RETRY_PAYMENT",
    },
  });

  console.log("Payment created:");
  console.log(payment.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());