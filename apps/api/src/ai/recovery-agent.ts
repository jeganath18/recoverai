import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const RecoveryDecisionSchema = z.object({
  classification: z.enum([
    "INSUFFICIENT_FUNDS",
    "NETWORK_ERROR",
    "TIMEOUT",
    "BANK_DECLINE",
    "FRAUD_RISK",
    "UNKNOWN",
  ]),

  recoverability: z.enum([
    "HIGH",
    "MEDIUM",
    "LOW",
    "NONE",
  ]),

  recommendedAction: z.enum([
    "RETRY_PAYMENT",
    "CUSTOMER_OUTREACH",
    "STOP_AND_REVIEW",
  ]),

  confidence: z.number().min(0).max(1),

  reason: z.string(),

  maxRetries: z.number().int().min(0).max(2),
});

export type RecoveryDecision =
  z.infer<typeof RecoveryDecisionSchema>;

export async function analyzeFailedPayment(input: {
  amount: number;
  currency: string;
  failureReason: string;
  previousAttempts: number;
}): Promise<RecoveryDecision> {
  const response =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: `
You are RecoverAI's payment recovery decision engine.

Analyze failed payments and recommend the safest
recovery strategy.

You NEVER execute payments.
You NEVER directly move money.
You NEVER invent information.

Rules:

- Fraud or suspicious activity:
  STOP_AND_REVIEW.

- Insufficient funds:
  CUSTOMER_OUTREACH.

- Temporary network or timeout failures:
  RETRY_PAYMENT may be recommended.

- Permanent bank declines:
  CUSTOMER_OUTREACH.

- Unknown failures:
  CUSTOMER_OUTREACH.

- Never recommend more than 2 retries.

- If uncertain, choose the safer action.

Return ONLY the requested structured decision.
          `,
        },

        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recovery_decision",
          strict: true,
          schema: {
            type: "object",

            properties: {
              classification: {
                type: "string",
                enum: [
                  "INSUFFICIENT_FUNDS",
                  "NETWORK_ERROR",
                  "TIMEOUT",
                  "BANK_DECLINE",
                  "FRAUD_RISK",
                  "UNKNOWN",
                ],
              },

              recoverability: {
                type: "string",
                enum: [
                  "HIGH",
                  "MEDIUM",
                  "LOW",
                  "NONE",
                ],
              },

              recommendedAction: {
                type: "string",
                enum: [
                  "RETRY_PAYMENT",
                  "CUSTOMER_OUTREACH",
                  "STOP_AND_REVIEW",
                ],
              },

              confidence: {
                type: "number",
              },

              reason: {
                type: "string",
              },

              maxRetries: {
                type: "integer",
              },
            },

            required: [
              "classification",
              "recoverability",
              "recommendedAction",
              "confidence",
              "reason",
              "maxRetries",
            ],

            additionalProperties: false,
          },
        },
      },
    });

  const content =
    response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq returned an empty response",
    );
  }

  return RecoveryDecisionSchema.parse(
    JSON.parse(content),
  );
}