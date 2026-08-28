import { prisma } from "../src/db/prisma";
import { recoveryDecisionQueue } from "../src/queue/recovery.queue";
import { razorpay } from "../src/services/razorpay.service";

async function waitForOutreach(paymentId: string) {
  for (let i = 0; i < 30; i++) {
    const recoveryCase =
      await prisma.recoveryCase.findUnique({
        where: {
          paymentId,
        },
        include: {
          attempts: true,
        },
      });

    if (
      recoveryCase &&
      recoveryCase.recommendedAction ===
        "CUSTOMER_OUTREACH" &&
      recoveryCase.outreachAttempts > 0
    ) {
      return recoveryCase;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000),
    );
  }

  throw new Error(
    "Outreach worker did not complete within 30 seconds.",
  );
}

async function main() {
  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "     RecoverAI — CUSTOMER OUTREACH DEMO",
  );
  console.log(
    "══════════════════════════════════════════",
  );

  // --------------------------------------------------
  // 1. Create failed payment
  // --------------------------------------------------

  const payment =
    await prisma.payment.create({
      data: {
        razorpayId:
          `pay_test_outreach_${Date.now()}`,
        amount: 290000,
        currency: "INR",
        status: "FAILED",
        failureReason: "Insufficient funds",
      },
    });

  console.log("\n💳 FAILED PAYMENT");
  console.log(
    "──────────────────────────────────────────",
  );
  console.log("Payment ID :", payment.id);
  console.log("Amount     : ₹2,900");
  console.log("Currency   : INR");
  console.log("Reason     : Insufficient funds");

  // --------------------------------------------------
  // 2. Trigger REAL AI decision
  // --------------------------------------------------

  console.log("\n🤖 RECOVERY AI");
  console.log(
    "──────────────────────────────────────────",
  );

  const job =
    await recoveryDecisionQueue.add(
      "analyze-failed-payment",
      {
        paymentId: payment.id,
        failureReason: "Insufficient funds",
        razorpayEventId:
          `test_outreach_event_${Date.now()}`,
      },
      {
        jobId:
          `demo-outreach-${payment.id}`,
      },
    );

  console.log(
    "Decision Job :",
    job.id,
  );

  console.log(
    "Waiting for AI + Policy + Outreach...",
  );

  // --------------------------------------------------
  // 3. Wait for outreach worker
  // --------------------------------------------------

  const recoveryCase =
    await waitForOutreach(payment.id);

  console.log("\n🧠 RECOVERY DECISION");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Case ID            :",
    recoveryCase.id,
  );

  console.log(
    "Status             :",
    recoveryCase.status,
  );

  console.log(
    "Recommended Action :",
    recoveryCase.recommendedAction,
  );

  console.log(
    "Outreach Attempts  :",
    recoveryCase.outreachAttempts,
  );

  // --------------------------------------------------
  // 4. Create Razorpay recovery order
  // --------------------------------------------------

  console.log("\n💰 CREATING RECOVERY ORDER");
  console.log(
    "──────────────────────────────────────────",
  );

  if (
    recoveryCase.recommendedAction !==
    "CUSTOMER_OUTREACH"
  ) {
    throw new Error(
      `Expected CUSTOMER_OUTREACH but received ${recoveryCase.recommendedAction}`,
    );
  }

  if (recoveryCase.status !== "OUTREACH") {
    throw new Error(
      `Expected OUTREACH status but received ${recoveryCase.status}`,
    );
  }

  const order =
    await razorpay.orders.create({
      amount: recoveryCase.amountAtRisk,
      currency: payment.currency,
      receipt:`outreach_${Date.now()}`,
      notes: {
        recoveryCaseId: recoveryCase.id,
        paymentId: payment.id,
        recoveryAction:
          "CUSTOMER_OUTREACH",
      },
    });

  console.log("\n✅ RAZORPAY ORDER CREATED");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Order ID :",
    order.id,
  );

  console.log(
    "Amount   :",
    `₹${Number(order.amount) / 100}`,
  );

  console.log(
    "Currency :",
    order.currency,
  );

  console.log(
    "Status   :",
    order.status,
  );

  // --------------------------------------------------
  // 5. Final output for demo
  // --------------------------------------------------

  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "        CUSTOMER OUTREACH READY",
  );
  console.log(
    "══════════════════════════════════════════",
  );

  console.log("\nCase ID:");
  console.log(recoveryCase.id);

  console.log("\nRazorpay Order ID:");
  console.log(order.id);

  console.log("\nCheckout amount:");
  console.log(
    `₹${Number(order.amount) / 100}`,
  );

  console.log("\nUse this order ID:");
  console.log(
    `👉 ${order.id}`,
  );

  console.log("\n");
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Customer Outreach demo failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });