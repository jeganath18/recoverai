import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { razorpay } from "../services/razorpay.service";

export async function razorpayRoutes(
  app: FastifyInstance,
) {
  app.post("/razorpay/orders", async (request, reply) => {
    const body = request.body as {
      amount: number;
      currency?: string;
      receipt?: string;
      customerId?: string;
    };

    if (!body.amount || body.amount <= 0) {
      return reply.code(400).send({
        error: "Amount must be greater than zero",
      });
    }

    const currency = body.currency ?? "INR";
    const receipt =
      body.receipt ?? `recoverai_${Date.now()}`;

    // 1. Create the real Razorpay order
    const razorpayOrder =
      await razorpay.orders.create({
        amount: body.amount,
        currency,
        receipt,
      });

    // 2. Persist the order in RecoverAI
    const order = await prisma.order.create({
      data: {
        razorpayId: razorpayOrder.id,
        amount: body.amount,
        currency,
        status: razorpayOrder.status,
        customerId: body.customerId ?? null,
      },
    });

    return reply.code(201).send({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
      localOrderId: order.id,
    });
  });
}