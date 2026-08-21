import {
  enforceRecoveryPolicy,
} from "../src/policies/recovery-policy";

function test(
  name: string,
  decision: any,
  amount: number,
) {
  const result = enforceRecoveryPolicy(
    decision,
    amount,
  );

  console.log(`\n${name}`);
  console.log(JSON.stringify(result, null, 2));
}

test(
  "Normal network failure",
  {
    classification: "NETWORK_ERROR",
    recoverability: "HIGH",
    recommendedAction: "RETRY_PAYMENT",
    confidence: 0.95,
    reason: "Temporary network failure",
    maxRetries: 1,
  },
  250000,
);

test(
  "Fraud attempt",
  {
    classification: "FRAUD_RISK",
    recoverability: "NONE",
    recommendedAction: "RETRY_PAYMENT",
    confidence: 0.99,
    reason: "Suspicious payment",
    maxRetries: 2,
  },
  250000,
);

test(
  "Too many retries",
  {
    classification: "NETWORK_ERROR",
    recoverability: "HIGH",
    recommendedAction: "RETRY_PAYMENT",
    confidence: 0.99,
    reason: "Network failure",
    maxRetries: 5,
  },
  250000,
);

test(
  "Low confidence",
  {
    classification: "UNKNOWN",
    recoverability: "LOW",
    recommendedAction: "RETRY_PAYMENT",
    confidence: 0.42,
    reason: "Unclear failure",
    maxRetries: 1,
  },
  250000,
);