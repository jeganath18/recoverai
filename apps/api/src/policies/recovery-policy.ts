import type { RecoveryDecision } from "../ai/recovery-agent";

export type RecoveryAction =
  | "RETRY_PAYMENT"
  | "CUSTOMER_OUTREACH"
  | "STOP_AND_REVIEW";

export type PolicyDecision = {
  allowed: boolean;
  action: RecoveryAction;
  reason: string;
};

const MAX_RETRIES = 2;
const MIN_RETRY_CONFIDENCE = 0.75;
const MAX_AUTO_RETRY_AMOUNT = 1_000_000; // ₹10,000 in paise

export function evaluateRecoveryPolicy(
  decision: RecoveryDecision,
  amount: number,
): PolicyDecision {
  if (amount <= 0) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason: "Payment amount must be greater than zero.",
    };
  }

  if (decision.classification === "FRAUD_RISK") {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "Fraud-risk payments cannot be automatically recovered.",
    };
  }

  if (decision.recommendedAction === "RETRY_PAYMENT") {
    if (decision.maxRetries > MAX_RETRIES) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          `Retry limit exceeds maximum allowed retries (${MAX_RETRIES}).`,
      };
    }

    if (decision.confidence < MIN_RETRY_CONFIDENCE) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          "AI confidence is below the automatic retry threshold.",
      };
    }

    if (amount > MAX_AUTO_RETRY_AMOUNT) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          "High-value payments require manual review before retry.",
      };
    }
  }

  return {
    allowed: true,
    action: decision.recommendedAction,
    reason: "Recovery recommendation passed policy checks.",
  };
}