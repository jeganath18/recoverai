import "dotenv/config";
import crypto from "crypto";

async function main() {
  // IMPORTANT: use the Razorpay payment ID, not the Prisma Payment ID.
  const paymentId = "pay_test_1787595192688";

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: "order_test_recovery",
          amount: 250000,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is missing",
    );
  }

  const signature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const eventId =
    `evt_test_captured_${Date.now()}`;

  const response = await fetch(
    "http://localhost:3000/webhooks/razorpay",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      body: rawBody,
    },
  );

  console.log("Status:", response.status);
  console.log(
    "Response:",
    await response.text(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});