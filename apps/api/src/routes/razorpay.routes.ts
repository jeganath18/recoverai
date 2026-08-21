import { FastifyInstance } from "fastify";
import { razorpay } from "../services/razorpay.service";

export async function razorpayRoutes(app: FastifyInstance) {
  app.post("/razorpay/orders", async (request, reply) => {
    const body = request.body as {
      amount: number;
      currency?: string;
      receipt?: string;
    };

    if (!body.amount || body.amount <= 0) {
      return reply.code(400).send({
        error: "Amount must be greater than zero",
      });
    }

    const order = await razorpay.orders.create({
      amount: body.amount,
      currency: body.currency ?? "INR",
      receipt: body.receipt ?? `recoverai_${Date.now()}`,
    });

    return reply.code(201).send({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });
  });
}