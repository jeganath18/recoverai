import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";
import { recoveryDecisionQueue } from "../queue/recovery.queue";
import { reconcileCapturedPayment } from "../services/payment-reconciliation.service";


export async function razorpayWebhook(app: FastifyInstance) {
    app.post(
        "/webhooks/razorpay",
        {
            config: {
                rawBody: true,
            },
        },
        async (request, reply) => {
            console.log("🔥 RAZORPAY WEBHOOK HIT", {
                event: (request.body as any)?.event,
                eventId: request.headers["x-razorpay-event-id"],
                signaturePresent: Boolean(
                    request.headers["x-razorpay-signature"],
                ),
            });
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

            const razorpayEventId =
                request.headers["x-razorpay-event-id"];

            if (
                !razorpayEventId ||
                typeof razorpayEventId !== "string"
            ) {
                return reply.code(400).send({
                    error: "Missing Razorpay event ID",
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

            console.log("📦 Razorpay event received:", {
                eventType,
                paymentId: paymentEntity?.id,
                orderId: paymentEntity?.order_id,
            });

            let payment = paymentId
                ? await prisma.payment.findUnique({
                    where: {
                        razorpayId: paymentId,
                    },
                })
                : null;

            if (!payment && paymentEntity?.order_id && paymentId) {
                const order = await prisma.order.findUnique({
                    where: {
                        razorpayId: paymentEntity.order_id,
                    },
                });

                if (order) {
                    payment = await prisma.payment.create({
                        data: {
                            razorpayId: paymentId,
                            orderId: order.id,
                            customerId: order.customerId,
                            amount: paymentEntity.amount ?? order.amount,
                            currency: paymentEntity.currency ?? order.currency,
                            status:
                                eventType === "payment.failed"
                                    ? "FAILED"
                                    : "CREATED",
                            failureReason:
                                paymentEntity.error_description ?? null,
                        },
                    });
                }
            }

            try {
                await prisma.paymentEvent.create({
                    data: {
                        razorpayEventId,
                        paymentId: payment?.id ?? null,
                        eventType,
                        payload: payload as any,
                    },
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002"
                ) {
                    request.log.info(
                        { razorpayEventId },
                        "Duplicate Razorpay webhook ignored",
                    );

                    return reply.code(200).send({
                        received: true,
                        duplicate: true,
                    });
                }

                throw error;
            }

            if (eventType === "payment.failed" && payment?.id) {
                const failureReason =
                    paymentEntity?.error_description ??
                    "Unknown payment failure";

                await recoveryDecisionQueue.add(
                    "payment-failed",
                    {
                        paymentId: payment.id,
                        failureReason,
                        razorpayEventId,
                    },
                    {
                        jobId: `razorpay-event-${razorpayEventId}`,
                    },
                );
            }

            console.log("🔎 Capture handling:", {
                eventType,
                paymentFound: Boolean(payment),
                localPaymentId: payment?.id,
                razorpayPaymentId: paymentId,
            });

            if (eventType === "payment.captured" && payment?.id) {
                try {
                    const result = await reconcileCapturedPayment(
                        payment.id,
                        razorpayEventId,
                    );

                    request.log.info(
                        {
                            paymentId: payment.id,
                            recoveryCaseId:
                                result.recoveryCase?.id,
                            amountRecovered:
                                result.recoveryCase?.amountRecovered ?? 0,
                        },
                        "Payment captured and recovery completed",
                    );
                } catch (error) {
                    request.log.error(
                        {
                            paymentId: payment.id,
                            error,
                        },
                        "Failed to mark payment as recovered",
                    );

                    throw error;
                }
            }

            return reply.code(200).send({
                received: true,
            });
        },
    );
}