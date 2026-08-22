import {
  analyzeFailedPayment,
  type RecoveryDecision,
} from "../ai/recovery-agent";

import {
  evaluateRecoveryDecision,
  type PolicyDecision,
} from "../policies/policy-engine";

export type RecoveryAgentResult = {
  diagnosis: {
    classification: RecoveryDecision["classification"];
    recoverability: RecoveryDecision["recoverability"];
    confidence: number;
    reason: string;
  };

  recommendation: RecoveryDecision;

  policy: PolicyDecision;
};

export async function runRecoveryAgent(input: {
  amount: number;
  currency: string;
  failureReason: string;
  previousAttempts: number;
}): Promise<RecoveryAgentResult> {

  // One GPT call only.
  const recommendation =
    await analyzeFailedPayment(input);

  // Derive diagnosis from the same AI response.
  const diagnosis = {
    classification:
      recommendation.classification,

    recoverability:
      recommendation.recoverability,

    confidence:
      recommendation.confidence,

    reason:
      recommendation.reason,
  };

  // Hard safety rules run AFTER AI.
  const policy =
    evaluateRecoveryDecision(
      recommendation,
      input.amount,
    );

  return {
    diagnosis,
    recommendation,
    policy,
  };
}