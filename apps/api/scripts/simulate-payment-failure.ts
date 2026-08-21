import "dotenv/config";
import crypto from "crypto";

async function main() {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }

  const payload = {
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: "pay_test_001",
          order_id: "order_test_001",
          amount: 250000,
          currency: "INR",
          status: "failed",
          error_description: "Payment failed due to insufficient funds",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  console.log("Sending simulated payment.failed event...");

  const response = await fetch(
    "http://localhost:3000/webhooks/razorpay",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: rawBody,
    },
  );

  console.log("Status:", response.status);
  console.log("Response:", await response.text());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});