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
  /*
   * Rule 1:
   * Invalid payment amounts can never be recovered automatically.
   */
  if (amount <= 0) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "Payment amount must be greater than zero.",
    };
  }

  /*
   * Rule 2:
   * Fraud-risk payments always require human review.
   */
  if (
    decision.classification ===
    "FRAUD_RISK"
  ) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "Fraud-risk payments cannot be automatically recovered.",
    };
  }

  /*
   * Rule 3:
   * Explicit AI request for manual review.
   */
  if (
    decision.recommendedAction ===
    "STOP_AND_REVIEW"
  ) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "AI determined that this recovery requires manual review.",
    };
  }

  /*
   * Rule 4:
   * Customer outreach is an allowed recovery action.
   *
   * Outreach does NOT directly move money.
   * It creates a customer-facing recovery opportunity.
   */
  if (
    decision.recommendedAction ===
    "CUSTOMER_OUTREACH"
  ) {
    return {
      allowed: true,
      action: "CUSTOMER_OUTREACH",
      reason:
        "Customer outreach is permitted by recovery policy.",
    };
  }

  /*
   * Rule 5:
   * Automatic payment retry requires
   * additional safety checks.
   */
  if (
    decision.recommendedAction ===
    "RETRY_PAYMENT"
  ) {
    if (
      decision.maxRetries > MAX_RETRIES
    ) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          `Retry limit exceeds maximum allowed retries (${MAX_RETRIES}).`,
      };
    }

    if (
      decision.confidence <
      MIN_RETRY_CONFIDENCE
    ) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          "AI confidence is below the automatic retry threshold.",
      };
    }

    if (
      amount > MAX_AUTO_RETRY_AMOUNT
    ) {
      return {
        allowed: false,
        action: "STOP_AND_REVIEW",
        reason:
          "High-value payments require manual review before retry.",
      };
    }

    return {
      allowed: true,
      action: "RETRY_PAYMENT",
      reason:
        "Recovery recommendation passed retry policy checks.",
    };
  }

  /*
   * Rule 6:
   * Never allow an unknown AI action
   * to reach execution.
   */
  return {
    allowed: false,
    action: "STOP_AND_REVIEW",
    reason:
      "Unsupported recovery action.",
  };
}