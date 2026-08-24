import { prisma } from "../db/prisma";
import { RecoveryCaseStatus } from "@prisma/client";

const transitions: Record<
  RecoveryCaseStatus,
  RecoveryCaseStatus[]
> = {
  OPEN: [
    RecoveryCaseStatus.RETRYING,
    RecoveryCaseStatus.OUTREACH,
    RecoveryCaseStatus.MANUAL_REVIEW,
    RecoveryCaseStatus.ABANDONED,
  ],

  RETRYING: [
    RecoveryCaseStatus.OPEN,
    RecoveryCaseStatus.RECOVERED,
    RecoveryCaseStatus.EXHAUSTED,
    RecoveryCaseStatus.MANUAL_REVIEW,
  ],

  OUTREACH: [
    RecoveryCaseStatus.OPEN,
    RecoveryCaseStatus.RECOVERED,
    RecoveryCaseStatus.EXHAUSTED,
    RecoveryCaseStatus.MANUAL_REVIEW,
  ],

  RECOVERED: [],
  EXHAUSTED: [],
  MANUAL_REVIEW: [],
  ABANDONED: [],
};

export function canTransition(
  from: RecoveryCaseStatus,
  to: RecoveryCaseStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertValidTransition(
  from: RecoveryCaseStatus,
  to: RecoveryCaseStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid RecoveryCase transition: ${from} -> ${to}`,
    );
  }
}

export async function transitionRecoveryCase(
  caseId: string,
  nextStatus: RecoveryCaseStatus,
  actor = "system",
) {
  return prisma.$transaction(async (tx) => {
    const recoveryCase =
      await tx.recoveryCase.findUnique({
        where: { id: caseId },
      });

    if (!recoveryCase) {
      throw new Error(
        `RecoveryCase ${caseId} not found`,
      );
    }

    assertValidTransition(
      recoveryCase.status,
      nextStatus,
    );

    const updatedCase =
      await tx.recoveryCase.update({
        where: { id: caseId },
        data: {
          status: nextStatus,
        },
      });

    await tx.auditEvent.create({
      data: {
        caseId,
        stage: "STATE_TRANSITION",
        actor,
        input: {
          from: recoveryCase.status,
          to: nextStatus,
        },
        output: {
          status: updatedCase.status,
        },
      },
    });

    return updatedCase;
  });
}

export function getAllowedTransitions(
  status: RecoveryCaseStatus,
): RecoveryCaseStatus[] {
  return [...transitions[status]];
}