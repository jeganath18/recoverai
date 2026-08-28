import { prisma } from "../db/prisma";

export async function getRecoveryMetrics() {
  const [
    totalCases,
    recoveredCases,
    exhaustedCases,
    manualReviewCases,
    retryingCases,
    outreachCases,
    openCases,
    totalAttempts,
    successfulAttempts,
  ] = await Promise.all([
    prisma.recoveryCase.count(),

    prisma.recoveryCase.count({
      where: {
        status: "RECOVERED",
      },
    }),

    prisma.recoveryCase.count({
      where: {
        status: "EXHAUSTED",
      },
    }),

    prisma.recoveryCase.count({
      where: {
        status: "MANUAL_REVIEW",
      },
    }),

    prisma.recoveryCase.count({
      where: {
        status: "RETRYING",
      },
    }),

    prisma.recoveryCase.count({
      where: {
        status: "OUTREACH",
      },
    }),

    prisma.recoveryCase.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.recoveryAttempt.count(),

    prisma.recoveryAttempt.count({
      where: {
        status: "SUCCEEDED",
      },
    }),
  ]);

  const amounts = await prisma.recoveryCase.aggregate({
    _sum: {
      amountAtRisk: true,
      amountRecovered: true,
    },
  });

  const amountAtRisk = amounts._sum.amountAtRisk ?? 0;
  const amountRecovered = amounts._sum.amountRecovered ?? 0;

  return {
    cases: {
      total: totalCases,
      recovered: recoveredCases,
      open: openCases,
      retrying: retryingCases,
      outreach: outreachCases,
      manualReview: manualReviewCases,
      exhausted: exhaustedCases,
    },

    revenue: {
      amountAtRisk,
      amountRecovered,
      amountOutstanding: Math.max(
        amountAtRisk - amountRecovered,
        0,
      ),
    },

    performance: {
      recoveryRate:
        totalCases === 0
          ? 0
          : recoveredCases / totalCases,

      revenueRecoveryRate:
        amountAtRisk === 0
          ? 0
          : amountRecovered / amountAtRisk,

      totalAttempts,
      successfulAttempts,

      retrySuccessRate:
        totalAttempts === 0
          ? 0
          : successfulAttempts / totalAttempts,
    },
  };
}