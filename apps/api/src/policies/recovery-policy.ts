import type { RecoveryDecision } from "../ai/recovery-agent";

export type PolicyResult = {
  allowed: boolean;
  action:
    | "RETRY_PAYMENT"
    | "CUSTOMER_OUTREACH"
    | "STOP_AND_REVIEW";
  reason: string;
};

export function enforceRecoveryPolicy(
  decision: RecoveryDecision,
  amount: number,
): PolicyResult {
  // NEVER automatically act on fraud-risk payments.
  if (decision.classification === "FRAUD_RISK") {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "Fraud-risk payment requires manual review.",
    };
  }

  // AI can never request more than 2 retries.
  if (decision.maxRetries > 2) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "Requested retry count exceeds the system safety limit.",
    };
  }

  // Invalid payment amounts are never recoverable.
  if (amount <= 0) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason: "Invalid payment amount.",
    };
  }

  // Don't automatically retry high-value transactions.
  // ₹10,000 = 1,000,000 paise.
  if (
    amount > 1_000_000 &&
    decision.recommendedAction === "RETRY_PAYMENT"
  ) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "High-value automatic retry requires manual review.",
    };
  }

  // Low-confidence decisions shouldn't trigger
  // automatic payment actions.
  if (
    decision.confidence < 0.75 &&
    decision.recommendedAction === "RETRY_PAYMENT"
  ) {
    return {
      allowed: false,
      action: "STOP_AND_REVIEW",
      reason:
        "AI confidence is below the automatic retry threshold.",
    };
  }

  return {
    allowed: true,
    action: decision.recommendedAction,
    reason:
      "AI recommendation satisfies RecoverAI safety policy.",
  };
}