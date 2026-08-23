import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { processFailedPayment } from "../services/recovery.service";
import { recoveryQueue } from "../queue/recovery.queue";


export async function razorpayWebhook(app: FastifyInstance) {
    app.post(
        "/webhooks/razorpay",
        {
            config: {
                rawBody: true,
            },
        },
        async (request, reply) => {
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

            if (!webhookSecret) {
                request.log.error("RAZORPAY_WEBHOOK_SECRET is not configured");

                return reply.code(500).send({
                    error: "Webhook configuration missing",
                });
            }

            const signature = request.headers["x-razorpay-signature"];

            if (!signature || typeof signature !== "string") {
                return reply.code(400).send({
                    error: "Missing Razorpay signature",
                });
            }

            const rawBody = request.rawBody;

            if (!rawBody) {
                return reply.code(400).send({
                    error: "Missing raw request body",
                });
            }

            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");

            const signatureBuffer = Buffer.from(signature, "utf8");
            const expectedBuffer = Buffer.from(expectedSignature, "utf8");

            if (
                signatureBuffer.length !== expectedBuffer.length ||
                !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
            ) {
                return reply.code(401).send({
                    error: "Invalid webhook signature",
                });
            }

            const payload = request.body as {
                event?: string;
                payload?: {
                    payment?: {
                        entity?: {
                            id?: string;
                            order_id?: string;
                            amount?: number;
                            currency?: string;
                            status?: string;
                            error_description?: string;
                        };
                    };
                };
            };

            const eventType = payload.event;

            if (!eventType) {
                return reply.code(400).send({
                    error: "Missing event type",
                });
            }

            const paymentEntity = payload.payload?.payment?.entity;

            const paymentId = paymentEntity?.id;

            const payment = paymentId
                ? await prisma.payment.findUnique({
                    where: {
                        razorpayId: paymentId,
                    },
                })
                : null;

            await prisma.paymentEvent.create({
                data: {
                    paymentId: payment?.id ?? null,
                    eventType,
                    payload: payload as any,
                },
            });

            if (eventType === "payment.failed" && payment?.id) {
                const failureReason =
                    paymentEntity?.error_description ??
                    "Unknown payment failure";

                await recoveryQueue.add(
                    "payment-failed",
                    {
                        paymentId: payment.id,
                        failureReason,
                    },
                    {
                        jobId: `payment-failed-${payment.id}`,
                        attempts: 3,
                        backoff: {
                            type: "exponential",
                            delay: 2000,
                        },
                        removeOnComplete: true,
                        removeOnFail: false,
                    },
                );
            }

            return reply.code(200).send({
                received: true,
            });
        },
    );
}