import "dotenv/config";

import crypto from "crypto";

import { prisma } from "../src/db/prisma";

const API_URL =
  process.env.API_URL ?? "http://localhost:3000";

const webhookSecret =
  process.env.RAZORPAY_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error(
    "RAZORPAY_WEBHOOK_SECRET is not configured",
  );
}

async function main() {
  const timestamp = Date.now();

  const razorpayPaymentId =
    `pay_test_recovery_${timestamp}`;

  const razorpayOrderId =
    `order_test_recovery_${timestamp}`;

  const razorpayEventId =
    `evt_test_recovery_${timestamp}`;

  console.log("\n=================================");
  console.log(" RecoverAI E2E Failed Payment Test");
  console.log("=================================\n");

  /*
   * 1. Create a local failed payment.
   *
   * This represents the Payment that Razorpay
   * would have already created before sending
   * payment.failed.
   */
  const payment = await prisma.payment.create({
    data: {
      razorpayId: razorpayPaymentId,
      amount: 290000,
      currency: "INR",
      status: "FAILED",
      failureReason:
        "Temporary network timeout",
    },
  });

  console.log("Payment created:");
  console.log({
    id: payment.id,
    razorpayId: payment.razorpayId,
    amount: payment.amount,
    status: payment.status,
  });

  /*
   * 2. Construct a Razorpay-shaped event.
   */
  const payload = {
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          amount: 250000,
          currency: "INR",
          status: "failed",
          error_description:
            "Temporary network timeout",
        },
      },
    },
  };

  /*
   * IMPORTANT:
   * Sign the EXACT bytes that we send.
   */
  const rawBody = JSON.stringify(payload);

  const signature = crypto
    .createHmac(
      "sha256",
      webhookSecret,
    )
    .update(rawBody)
    .digest("hex");

  console.log("\nWebhook event:");
  console.log({
    event: "payment.failed",
    razorpayEventId,
  });

  /*
   * 3. Hit YOUR real webhook.
   */
  const response = await fetch(
    `${API_URL}/webhooks/razorpay`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id":
          razorpayEventId,
      },

      body: rawBody,
    },
  );

  const responseText =
    await response.text();

  console.log("\nWebhook response:");
  console.log(
    response.status,
    responseText,
  );

  if (!response.ok) {
    throw new Error(
      `Webhook failed with HTTP ${response.status}`,
    );
  }

  console.log(
    "\n✅ payment.failed successfully delivered to RecoverAI",
  );

  console.log(
    "\nPayment ID:",
    payment.id,
  );

  console.log(
    "\nWatch your Decision Worker now.",
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ E2E test failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });