import {
  evaluateRecoveryPolicy,
  type PolicyDecision,
} from "./recovery-policy";

import type { RecoveryDecision } from "../ai/recovery-agent";

export function evaluateRecoveryDecision(
  decision: RecoveryDecision,
  amount: number,
): PolicyDecision {
  return evaluateRecoveryPolicy(
    decision,
    amount,
  );
}