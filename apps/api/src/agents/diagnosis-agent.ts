import {
  analyzeFailedPayment,
  type RecoveryDecision,
} from "../ai/recovery-agent";

export type DiagnosisResult = {
  classification: RecoveryDecision["classification"];
  recoverability: RecoveryDecision["recoverability"];
  confidence: number;
  reason: string;
};

export async function diagnosePaymentFailure(input: {
  amount: number;
  currency: string;
  failureReason: string;
  previousAttempts: number;
}): Promise<DiagnosisResult> {
  const decision = await analyzeFailedPayment(input);

  return {
    classification: decision.classification,
    recoverability: decision.recoverability,
    confidence: decision.confidence,
    reason: decision.reason,
  };
}