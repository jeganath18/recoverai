import {
  diagnosePaymentFailure,
} from "./diagnosis-agent";

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
    classification: string;
    recoverability: string;
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
  const diagnosis =
    await diagnosePaymentFailure(input);

  const recommendation =
    await analyzeFailedPayment(input);

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