import {
  assertValidTransition,
  canTransition,
  getAllowedTransitions,
} from "../src/services/recovery-state.service";
import { RecoveryCaseStatus } from "@prisma/client";

function test(
  name: string,
  fn: () => void,
) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("OPEN can transition to RETRYING", () => {
  if (
    !canTransition(
      RecoveryCaseStatus.OPEN,
      RecoveryCaseStatus.RETRYING,
    )
  ) {
    throw new Error("Transition should be allowed");
  }
});

test("OPEN can transition to OUTREACH", () => {
  if (
    !canTransition(
      RecoveryCaseStatus.OPEN,
      RecoveryCaseStatus.OUTREACH,
    )
  ) {
    throw new Error("Transition should be allowed");
  }
});

test("RECOVERED is terminal", () => {
  if (
    canTransition(
      RecoveryCaseStatus.RECOVERED,
      RecoveryCaseStatus.OPEN,
    )
  ) {
    throw new Error(
      "RECOVERED should be terminal",
    );
  }
});

test("EXHAUSTED is terminal", () => {
  if (
    canTransition(
      RecoveryCaseStatus.EXHAUSTED,
      RecoveryCaseStatus.RETRYING,
    )
  ) {
    throw new Error(
      "EXHAUSTED should be terminal",
    );
  }
});

test("invalid transition throws", () => {
  try {
    assertValidTransition(
      RecoveryCaseStatus.RECOVERED,
      RecoveryCaseStatus.RETRYING,
    );

    throw new Error(
      "Expected transition to throw",
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Invalid")
    ) {
      throw error;
    }
  }
});

console.log(
  "Allowed OPEN transitions:",
  getAllowedTransitions(
    RecoveryCaseStatus.OPEN,
  ),
);