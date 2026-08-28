import { prisma } from "../src/db/prisma";
import { recoveryDecisionQueue } from "../src/queue/recovery.queue";

async function waitForRetry(
  paymentId: string,
) {
  for (let i = 0; i < 30; i++) {
    const recoveryCase =
      await prisma.recoveryCase.findUnique({
        where: {
          paymentId,
        },
      });

    if (
      recoveryCase &&
      recoveryCase.recommendedAction ===
        "RETRY_PAYMENT" &&
      recoveryCase.retryAttempts > 0
    ) {
      return recoveryCase;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000),
    );
  }

  throw new Error(
    "Retry worker did not complete within 30 seconds.",
  );
}

async function main() {
  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "          RecoverAI — RETRY DEMO",
  );
  console.log(
    "══════════════════════════════════════════",
  );

  // --------------------------------------------------
  // 1. Create simulated failed payment
  // --------------------------------------------------

  const payment =
    await prisma.payment.create({
      data: {
        razorpayId:
          `pay_test_retry_${Date.now()}`,
        amount: 290000,
        currency: "INR",
        status: "FAILED",
        failureReason:
          "Temporary network timeout",
      },
    });

  console.log("\n💳 FAILED PAYMENT");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Payment ID :",
    payment.id,
  );

  console.log(
    "Amount     : ₹2,900",
  );

  console.log(
    "Currency   : INR",
  );

  console.log(
    "Reason     : Temporary network timeout",
  );

  // --------------------------------------------------
  // 2. Trigger REAL AI pipeline
  // --------------------------------------------------

  console.log("\n🤖 RECOVERY AI");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Sending payment to decision worker...",
  );

  const job =
    await recoveryDecisionQueue.add(
      "analyze-failed-payment",
      {
        paymentId: payment.id,
        failureReason:
          "Temporary network timeout",
        razorpayEventId:
          `test_retry_event_${Date.now()}`,
      },
      {
        jobId:
          `demo-retry-${payment.id}`,
      },
    );

  console.log(
    "Decision Job :",
    job.id,
  );

  console.log(
    "Waiting for AI + Policy + Retry Worker...",
  );

  // --------------------------------------------------
  // 3. Wait for retry execution
  // --------------------------------------------------

  const recoveryCase =
    await waitForRetry(payment.id);

  // --------------------------------------------------
  // 4. Load complete case
  // --------------------------------------------------

  const finalCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: recoveryCase.id,
      },
      include: {
        payment: true,
        attempts: true,
        audits: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (!finalCase) {
    throw new Error(
      "Recovery case could not be loaded.",
    );
  }

  // --------------------------------------------------
  // 5. AI + policy
  // --------------------------------------------------

  const aiAudit =
    finalCase.audits.find(
      (audit) =>
        audit.stage === "AI_DECISION",
    );

  const policyAudit =
    finalCase.audits.find(
      (audit) =>
        audit.stage === "POLICY_DECISION",
    );

  const ai =
    aiAudit?.output as any;

  const policy =
    policyAudit?.output as any;

  // --------------------------------------------------
  // 6. AI diagnosis
  // --------------------------------------------------

  console.log("\n🧠 AI DIAGNOSIS");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Classification :",
    ai?.diagnosis?.classification ??
      "N/A",
  );

  console.log(
    "Recoverability :",
    ai?.diagnosis?.recoverability ??
      "N/A",
  );

  console.log(
    "Confidence     :",
    ai?.diagnosis?.confidence != null
      ? `${Math.round(
          ai.diagnosis.confidence * 100,
        )}%`
      : "N/A",
  );

  console.log(
    "Reason         :",
    ai?.diagnosis?.reason ??
      "N/A",
  );

  // --------------------------------------------------
  // 7. Policy
  // --------------------------------------------------

  console.log("\n🛡️ POLICY DECISION");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Action  :",
    policy?.action ?? "N/A",
  );

  console.log(
    "Allowed :",
    policy?.allowed ?? "N/A",
  );

  console.log(
    "Reason  :",
    policy?.reason ?? "N/A",
  );

  // --------------------------------------------------
  // 8. Retry attempt
  // --------------------------------------------------

  const retryAttempt =
    finalCase.attempts.find(
      (attempt) =>
        attempt.action ===
        "RETRY_PAYMENT",
    );

  console.log("\n🔄 RETRY EXECUTION");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Retry Attempt :",
    retryAttempt?.attemptNumber ??
      "N/A",
  );

  console.log(
    "Attempt Status:",
    retryAttempt?.status ??
      "N/A",
  );

  console.log(
    "Retry Count   :",
    finalCase.retryAttempts,
  );

  // --------------------------------------------------
  // 9. Extract order ID
  // --------------------------------------------------

  const retryOutput =
    retryAttempt?.output as {
      orderId?: string;
      localOrderId?: string;
      amount?: number;
      currency?: string;
    } | null;

  const orderId =
    retryAttempt?.externalId ??
    retryOutput?.orderId;

  if (orderId) {
    console.log(
      "Razorpay Order:",
      orderId,
    );
  } else {
    console.log(
      "Razorpay Order: Not created",
    );
  }

  // --------------------------------------------------
  // 10. Audit trail
  // --------------------------------------------------

  console.log("\n📜 AUDIT TRAIL");
  console.log(
    "──────────────────────────────────────────",
  );

  for (const audit of finalCase.audits) {
    console.log(
      `✓ ${audit.stage} — ${audit.actor}`,
    );
  }

  // --------------------------------------------------
  // 11. Final state
  // --------------------------------------------------

  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "             RETRY READY",
  );
  console.log(
    "══════════════════════════════════════════",
  );

  console.log("\nCase ID:");
  console.log(finalCase.id);

  console.log("\nStatus:");
  console.log(finalCase.status);

  console.log("\nRecommended Action:");
  console.log(
    finalCase.recommendedAction,
  );

  if (orderId) {
    console.log("\nRecovery Order ID:");
    console.log(orderId);
  }

  console.log("\n");
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Retry demo failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });