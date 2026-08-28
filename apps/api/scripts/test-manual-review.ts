import { prisma } from "../src/db/prisma";
import { recoveryDecisionQueue } from "../src/queue/recovery.queue";

async function waitForManualReview(
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
      recoveryCase.status === "MANUAL_REVIEW"
    ) {
      return recoveryCase;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000),
    );
  }

  throw new Error(
    "Manual review decision was not completed within 30 seconds.",
  );
}

async function main() {
  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "       RecoverAI — MANUAL REVIEW DEMO",
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
          `pay_test_manual_${Date.now()}`,
        amount: 290000,
        currency: "INR",
        status: "FAILED",
        failureReason:
          "Suspicious transaction pattern",
      },
    });

  console.log("\n🚨 FAILED PAYMENT");
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
    "Reason     : Suspicious transaction pattern",
  );

  // --------------------------------------------------
  // 2. Trigger REAL AI decision pipeline
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
          "Suspicious transaction pattern",
        razorpayEventId:
          `test_manual_event_${Date.now()}`,
      },
      {
        jobId:
          `demo-manual-${payment.id}`,
      },
    );

  console.log(
    "Decision Job :",
    job.id,
  );

  console.log(
    "Waiting for AI + Policy...",
  );

  // --------------------------------------------------
  // 3. Wait for MANUAL_REVIEW
  // --------------------------------------------------

  const recoveryCase =
    await waitForManualReview(
      payment.id,
    );

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
  // 5. Extract AI + policy decisions
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
  // 6. Display AI diagnosis
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
  // 7. Display policy decision
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
  // 8. Final state
  // --------------------------------------------------

  console.log("\n🚧 FINAL RECOVERY STATE");
  console.log(
    "──────────────────────────────────────────",
  );

  console.log(
    "Case ID           :",
    finalCase.id,
  );

  console.log(
    "Status            :",
    finalCase.status,
  );

  console.log(
    "Recommended Action:",
    finalCase.recommendedAction,
  );

  console.log(
    "Retry Attempts    :",
    finalCase.retryAttempts,
  );

  console.log(
    "Outreach Attempts :",
    finalCase.outreachAttempts,
  );

  // --------------------------------------------------
  // 9. Audit trail
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
  // 10. Final demo message
  // --------------------------------------------------

  console.log("\n");
  console.log(
    "══════════════════════════════════════════",
  );
  console.log(
    "       AUTOMATION SAFELY STOPPED",
  );
  console.log(
    "══════════════════════════════════════════",
  );

  console.log("\nCase ID:");
  console.log(finalCase.id);

  console.log("\nNo payment order was created.");
  console.log(
    "The case requires human review.",
  );

  console.log("\n");
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Manual Review demo failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });