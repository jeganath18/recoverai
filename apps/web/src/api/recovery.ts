const API_BASE_URL =
    import.meta.env.VITE_API_URL ??
    "http://localhost:3000";

export type RecoveryMetrics = {
    cases: {
        total: number;
        recovered: number;
        open: number;
        retrying: number;
        outreach: number;
        manualReview: number;
        exhausted: number;
    };

    revenue: {
        amountAtRisk: number;
        amountRecovered: number;
        amountOutstanding: number;
    };

    performance: {
        recoveryRate: number;
        revenueRecoveryRate: number;
        totalAttempts: number;
        successfulAttempts: number;
        retrySuccessRate: number;
    };
};

export async function getRecoveryMetrics(): Promise<RecoveryMetrics> {
    const response = await fetch(
        `${API_BASE_URL}/recovery/metrics`,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch recovery metrics (${response.status})`,
        );
    }

    return response.json();
}

export type RecoveryCase = {
    id: string;
    paymentId: string;
    amountAtRisk: number;
    status: string;
    failureReason: string | null;
    recommendedAction: string | null;
    amountRecovered: number;
    retryAttempts: number;
    outreachAttempts: number;
    createdAt: string;
    updatedAt: string;

    payment: {
        id: string;
        razorpayId: string;
        amount: number;
        currency: string;
        status: string;
        failureReason: string | null;
    };

    attempts: RecoveryAttempt[];
    audits: AuditEvent[];
};

export type RecoveryAttempt = {
    id: string;
    attemptNumber: number;
    action: string;
    status: string;
    idempotencyKey: string;
    externalId: string | null;
    input: unknown;
    output: unknown;
    createdAt: string;
};

export type AuditEvent = {
    id: string;
    stage: string;
    actor: string;
    input: unknown;
    output: unknown;
    createdAt: string;
};

export async function getRecoveryCases() {
    const response = await fetch(
        `${API_BASE_URL}/recovery/cases`,
    );

    if (!response.ok) {
        throw new Error(
            "Failed to fetch recovery cases",
        );
    }

    return response.json() as Promise<{
        cases: RecoveryCase[];
    }>;
}

export async function getRecoveryCase(
    id: string,
) {
    const response = await fetch(
        `${API_BASE_URL}/recovery/cases/${id}`,
    );

    if (!response.ok) {
        throw new Error(
            "Failed to fetch recovery case",
        );
    }

    return response.json() as Promise<{
        case: RecoveryCase;
    }>;
}

export type RecoveryBatch = {
    batch: {
        totalCases: number;
        recoveredCases: number;
        amountAtRisk: number;
        amountRecovered: number;
        amountOutstanding: number;
        recoveryRate: number;
        revenueRecoveryRate: number;
        totalAttempts: number;
        successfulAttempts: number;
    };

    cases: Array<{
        id: string;
        status: string;
        amountAtRisk: number;
        amountRecovered: number;
        failureReason: string | null;
        recommendedAction: string | null;
        retryAttempts: number;
        outreachAttempts: number;

        payment: {
            id: string;
            razorpayId: string;
            status: string;
            amount: number;
            currency: string;
        };

        attempts: Array<{
            attemptNumber: number;
            action: string;
            status: string;
            externalId: string | null;
        }>;
    }>;
};

export async function getRecoveryBatch(): Promise<RecoveryBatch> {
    const response = await fetch(
        "http://localhost:3000/recovery/batch",
    );

    if (!response.ok) {
        throw new Error(
            "Failed to fetch recovery batch",
        );
    }

    return response.json();
}

export async function sendCustomerOutreach(
    caseId: string,
    channel: "EMAIL" | "SMS" | "WHATSAPP" = "EMAIL",
) {
    const response = await fetch(
        `${API_BASE_URL}/recovery/cases/${caseId}/outreach`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                channel,
            }),
        },
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ?? "Failed to send customer outreach",
        );
    }

    return data;
}


export async function createOutreachPayment(
    caseId: string,
) {
    const response = await fetch(
        `${API_BASE_URL}/recovery/cases/${caseId}/outreach/pay`,
        {
            method: "POST",
        },
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ??
                "Failed to create recovery payment",
        );
    }

    return data as {
        caseId: string;
        orderId: string;
        amount: number;
        currency: string;
    };
}

