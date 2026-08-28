import {
    ArrowLeft,
    Bot,
    Check,
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileCheck2,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    XCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
    getRecoveryCase,
    type AuditEvent,
    type RecoveryCase,
} from "../api/recovery";

import { Sidebar } from "../components/Sidebar";

import {
    formatINR,
} from "../utils";

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const styles: Record<string, string> = {
        RECOVERED:
            "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
        RETRYING:
            "border-blue-500/20 bg-blue-500/8 text-blue-400",
        MANUAL_REVIEW:
            "border-amber-500/20 bg-amber-500/8 text-amber-400",
        EXHAUSTED:
            "border-red-500/20 bg-red-500/8 text-red-400",
        OUTREACH:
            "border-amber-500/20 bg-amber-500/8 text-amber-400",
    };

    return (
        <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${styles[status] ??
                "border-white/10 bg-white/5 text-zinc-400"
                }`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function formatTime(date: string) {
    return new Date(date).toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        },
    );
}

function getAuditIcon(stage: string) {
    switch (stage) {
        case "AI_DECISION":
            return Bot;

        case "POLICY_DECISION":
            return ShieldCheck;

        case "RETRY_EXECUTION":
            return RefreshCw;

        case "PAYMENT_RECONCILIATION":
            return FileCheck2;

        case "PAYMENT_CAPTURED":
            return CheckCircle2;

        case "STATE_TRANSITION":
            return Check;

        default:
            return Clock3;
    }
}

function getAuditDescription(
    audit: AuditEvent,
) {
    const output =
        audit.output as Record<
            string,
            unknown
        >;

    const input =
        audit.input as Record<
            string,
            unknown
        >;

    switch (audit.stage) {
        case "AI_DECISION": {
            const diagnosis =
                output.diagnosis as
                | Record<string, unknown>
                | undefined;

            return (
                diagnosis?.reason ??
                "AI analyzed the failed payment."
            );
        }

        case "POLICY_DECISION":
            return (
                output.reason ??
                "Recovery policy evaluated the recommendation."
            );

        case "RETRY_EXECUTION":
            return output.orderId
                ? `Recovery order ${String(
                    output.orderId,
                )} created in Razorpay.`
                : "Recovery retry was executed.";

        case "PAYMENT_RECONCILIATION":
            return output.capturedPaymentStatus ===
                "CAPTURED"
                ? "Captured recovery payment matched to the original recovery case."
                : "Captured payment reconciliation completed.";

        case "PAYMENT_CAPTURED":
            return output.amountRecovered
                ? `${formatINR(
                    Number(output.amountRecovered),
                )} confirmed as recovered revenue.`
                : "Payment was captured.";

        case "STATE_TRANSITION":
            return `${String(
                input.from ?? "",
            )} → ${String(input.to ?? "")}`;

        default:
            return "Recovery event recorded.";
    }
}

function getDiagnosis(
    recoveryCase: RecoveryCase,
) {
    const aiAudit =
        recoveryCase.audits.find(
            (audit) =>
                audit.stage === "AI_DECISION",
        );

    if (!aiAudit) {
        return null;
    }

    const output =
        aiAudit.output as Record<
            string,
            unknown
        >;

    const diagnosis =
        output.diagnosis as
        | Record<string, unknown>
        | undefined;

    const recommendation =
        output.recommendation as
        | Record<string, unknown>
        | undefined;

    return {
        classification:
            diagnosis?.classification ??
            "UNKNOWN",

        recoverability:
            diagnosis?.recoverability ??
            "UNKNOWN",

        confidence:
            Number(
                diagnosis?.confidence ??
                recommendation?.confidence ??
                0,
            ),

        reason:
            diagnosis?.reason ??
            recommendation?.reason ??
            "No diagnosis available.",
    };
}

export function CaseDetails() {
    const { id } = useParams<{
        id: string;
    }>();

    const [recoveryCase, setRecoveryCase] =
        useState<RecoveryCase | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    async function loadCase() {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);

            const result =
                await getRecoveryCase(id);

            setRecoveryCase(result.case);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load recovery case.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCase();
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#09090b]">
                <Sidebar />

                <main className="flex-1 p-8">
                    <div className="mx-auto max-w-[1200px]">
                        <div className="h-6 w-32 animate-pulse rounded bg-white/5" />

                        <div className="mt-8 h-48 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />
                    </div>
                </main>
            </div>
        );
    }

    if (error || !recoveryCase) {
        return (
            <div className="flex min-h-screen bg-[#09090b]">
                <Sidebar />

                <main className="flex-1 p-8">
                    <div className="mx-auto max-w-[1200px]">
                        <Link
                            to="/cases"
                            className="mb-8 inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
                        >
                            <ArrowLeft size={14} />
                            Back to cases
                        </Link>

                        <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-6 text-sm text-red-300">
                            {error ??
                                "Recovery case not found."}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const diagnosis =
        getDiagnosis(recoveryCase);

    const recovered =
        recoveryCase.status ===
        "RECOVERED";

    return (
        <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
            <Sidebar />

            <main className="min-w-0 flex-1">
                <header className="flex h-18 items-center border-b border-white/8 px-5 sm:px-8">
                    <Link
                        to="/cases"
                        className="inline-flex items-center gap-2 text-xs text-zinc-500 transition hover:text-white"
                    >
                        <ArrowLeft size={14} />
                        Recovery Cases
                    </Link>
                </header>

                <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
                    {/* HERO */}

                    <section className="mb-8">
                        <div className="mb-5 flex items-center gap-3">
                            <StatusBadge
                                status={recoveryCase.status}
                            />

                            <span className="font-mono text-[11px] text-zinc-600">
                                {recoveryCase.id}
                            </span>
                        </div>

                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                            <div>
                                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-zinc-600">
                                    Revenue recovery case
                                </p>

                                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">
                                    {recovered
                                        ? formatINR(
                                            recoveryCase.amountRecovered,
                                        )
                                        : formatINR(
                                            recoveryCase.amountAtRisk,
                                        )}
                                </h1>

                                <p className="mt-2 text-sm text-zinc-500">
                                    {recovered
                                        ? "confirmed recovered revenue"
                                        : "revenue currently at risk"}
                                </p>
                            </div>

                            <div className="text-left lg:text-right">
                                <p className="text-xs text-zinc-600">
                                    Original payment
                                </p>

                                <p className="mt-1 font-mono text-xs text-zinc-400">
                                    {recoveryCase.payment.razorpayId}
                                </p>

                                <p className="mt-1 text-[11px] text-red-400">
                                    {recoveryCase.payment.status}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* OUTCOME */}

                    <section className="mb-6 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                            <div className="mb-5 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/15 bg-emerald-500/8">
                                    <CheckCircle2
                                        size={16}
                                        className="text-emerald-400"
                                    />
                                </div>

                                <span className="text-xs uppercase tracking-[0.1em] text-zinc-500">
                                    Recovery outcome
                                </span>
                            </div>

                            <p className="text-xl font-semibold text-white">
                                {recovered
                                    ? formatINR(
                                        recoveryCase.amountRecovered,
                                    )
                                    : "Not recovered"}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                                of{" "}
                                {formatINR(
                                    recoveryCase.amountAtRisk,
                                )}{" "}
                                at risk
                            </p>
                        </div>

                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                            <div className="mb-5 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/15 bg-blue-500/8">
                                    <RefreshCw
                                        size={16}
                                        className="text-blue-400"
                                    />
                                </div>

                                <span className="text-xs uppercase tracking-[0.1em] text-zinc-500">
                                    Intervention
                                </span>
                            </div>

                            <p className="text-xl font-semibold text-white">
                                {
                                    recoveryCase
                                        .recommendedAction
                                }
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                                {recoveryCase.retryAttempts}{" "}
                                of 2 retries used
                            </p>
                        </div>

                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                            <div className="mb-5 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/15 bg-violet-500/8">
                                    <Sparkles
                                        size={16}
                                        className="text-violet-400"
                                    />
                                </div>

                                <span className="text-xs uppercase tracking-[0.1em] text-zinc-500">
                                    AI confidence
                                </span>
                            </div>

                            <p className="text-xl font-semibold text-white">
                                {diagnosis
                                    ? `${Math.round(
                                        diagnosis.confidence *
                                        100,
                                    )}%`
                                    : "—"}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                                {diagnosis
                                    ? String(
                                        diagnosis.recoverability,
                                    )
                                    : "No diagnosis"}
                            </p>
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        {/* AI + POLICY */}

                        <div className="space-y-6">
                            <section className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/15 bg-violet-500/8">
                                        <Bot
                                            size={18}
                                            className="text-violet-400"
                                        />
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            AI diagnosis
                                        </p>

                                        <p className="text-xs text-zinc-600">
                                            Why the agent chose this recovery path
                                        </p>
                                    </div>
                                </div>

                                {diagnosis ? (
                                    <>
                                        <div className="mb-5 grid grid-cols-3 gap-3">
                                            <div className="rounded-lg border border-white/6 bg-black/20 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                                                    Classification
                                                </p>

                                                <p className="mt-2 text-sm font-medium text-white">
                                                    {String(
                                                        diagnosis.classification,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-white/6 bg-black/20 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                                                    Recoverability
                                                </p>

                                                <p className="mt-2 text-sm font-medium text-emerald-400">
                                                    {String(
                                                        diagnosis.recoverability,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-white/6 bg-black/20 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                                                    Confidence
                                                </p>

                                                <p className="mt-2 text-sm font-medium text-white">
                                                    {Math.round(
                                                        diagnosis.confidence *
                                                        100,
                                                    )}
                                                    %
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-l-2 border-violet-500/30 pl-4">
                                            <p className="text-sm leading-6 text-zinc-400">
                                                {String(
                                                    diagnosis.reason,
                                                )}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-zinc-600">
                                        AI decision data unavailable.
                                    </p>
                                )}
                            </section>

                            <section className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/15 bg-emerald-500/8">
                                        <ShieldCheck
                                            size={18}
                                            className="text-emerald-400"
                                        />
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            Recovery policy
                                        </p>

                                        <p className="text-xs text-zinc-600">
                                            Bounded intervention
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 p-3">
                                        <span className="text-xs text-zinc-500">
                                            Recommended action
                                        </span>

                                        <span className="text-xs font-medium text-white">
                                            {
                                                recoveryCase
                                                    .recommendedAction
                                            }
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 p-3">
                                        <span className="text-xs text-zinc-500">
                                            Maximum retries
                                        </span>

                                        <span className="text-xs font-medium text-white">
                                            2
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 p-3">
                                        <span className="text-xs text-zinc-500">
                                            Retries consumed
                                        </span>

                                        <span className="text-xs font-medium text-white">
                                            {
                                                recoveryCase.retryAttempts
                                            }
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 p-3">
                                        <span className="text-xs text-zinc-500">
                                            Recovery state
                                        </span>

                                        <StatusBadge
                                            status={
                                                recoveryCase.status
                                            }
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RECOVERY JOURNEY */}

                        <section className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                            <div className="mb-7">
                                <p className="text-sm font-medium text-white">
                                    Recovery journey
                                </p>

                                <p className="mt-1 text-xs text-zinc-600">
                                    From failure to financial outcome
                                </p>
                            </div>

                            <div className="relative ml-2">
                                <div className="absolute left-[7px] top-2 h-[calc(100%-20px)] w-px bg-white/8" />

                                <JourneyStep
                                    title="Payment failed"
                                    description={
                                        recoveryCase.failureReason ??
                                        "Payment failure detected"
                                    }
                                    complete
                                />

                                <JourneyStep
                                    title="AI diagnosis"
                                    description={
                                        diagnosis
                                            ? `${String(
                                                diagnosis.classification,
                                            )} · ${Math.round(
                                                diagnosis.confidence *
                                                100,
                                            )}% confidence`
                                            : "AI analysis"
                                    }
                                    complete
                                />

                                <JourneyStep
                                    title="Policy decision"
                                    description={
                                        recoveryCase.recommendedAction ??
                                        "Policy evaluated"
                                    }
                                    complete
                                />

                                <JourneyStep
                                    title="Recovery attempt"
                                    description={
                                        recoveryCase.attempts[0]
                                            ?.externalId ??
                                        "Recovery action executed"
                                    }
                                    complete={
                                        recoveryCase.attempts
                                            .length > 0
                                    }
                                />

                                <JourneyStep
                                    title="Payment reconciliation"
                                    description={
                                        recovered
                                            ? "Recovery payment matched to case"
                                            : "Awaiting captured payment"
                                    }
                                    complete={recovered}
                                />

                                <JourneyStep
                                    title="Revenue recovered"
                                    description={
                                        recovered
                                            ? `${formatINR(
                                                recoveryCase.amountRecovered,
                                            )} confirmed`
                                            : "Not recovered yet"
                                    }
                                    complete={recovered}
                                    final
                                />
                            </div>
                        </section>
                    </div>

                    {/* AUDIT TRAIL */}

                    <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
                        <div className="mb-7 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-white">
                                    Audit trail
                                </p>

                                <p className="mt-1 text-xs text-zinc-600">
                                    Immutable recovery decision history
                                </p>
                            </div>

                            <span className="font-mono text-[10px] text-zinc-700">
                                {recoveryCase.audits.length} events
                            </span>
                        </div>

                        <div className="space-y-1">
                            {recoveryCase.audits.map(
                                (audit) => {
                                    const Icon =
                                        getAuditIcon(
                                            audit.stage,
                                        );

                                    return (
                                        <div
                                            key={audit.id}
                                            className="group flex gap-4 rounded-lg p-3 transition hover:bg-white/[0.025]"
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/20 text-zinc-500 transition group-hover:border-white/15 group-hover:text-zinc-300">
                                                    <Icon size={15} />
                                                </div>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-medium text-zinc-300">
                                                        {formatStage(
                                                            audit.stage,
                                                        )}
                                                    </span>

                                                    <span className="text-[10px] text-zinc-700">
                                                        ·
                                                    </span>

                                                    <span className="text-[10px] text-zinc-600">
                                                        {audit.actor}
                                                    </span>

                                                    <span className="ml-auto font-mono text-[10px] text-zinc-700">
                                                        {formatTime(
                                                            audit.createdAt,
                                                        )}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-zinc-600">
                                                    {String(
                                                        getAuditDescription(
                                                            audit,
                                                        ),
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    {/* ATTEMPTS */}

                    <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
                        <div className="mb-6">
                            <p className="text-sm font-medium text-white">
                                Recovery attempts
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                                Every execution is idempotent and auditable
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/8 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                                        <th className="pb-3">
                                            Attempt
                                        </th>

                                        <th className="pb-3">
                                            Action
                                        </th>

                                        <th className="pb-3">
                                            Status
                                        </th>

                                        <th className="pb-3">
                                            External ID
                                        </th>

                                        <th className="pb-3">
                                            Created
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recoveryCase.attempts.map(
                                        (attempt) => (
                                            <tr
                                                key={attempt.id}
                                                className="border-b border-white/5 last:border-0"
                                            >
                                                <td className="py-4 text-xs text-zinc-400">
                                                    #{attempt.attemptNumber}
                                                </td>

                                                <td className="py-4 text-xs text-zinc-400">
                                                    {attempt.action}
                                                </td>

                                                <td className="py-4">
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-emerald-400">
                                                        <Check
                                                            size={12}
                                                        />
                                                        {attempt.status}
                                                    </span>
                                                </td>

                                                <td className="py-4">
                                                    {attempt.externalId ? (
                                                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                                                            {
                                                                attempt.externalId
                                                            }

                                                            <ExternalLink
                                                                size={10}
                                                            />
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-700">
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 text-[10px] text-zinc-600">
                                                    {new Date(
                                                        attempt.createdAt,
                                                    ).toLocaleString()}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function JourneyStep({
    title,
    description,
    complete,
    final = false,
}: {
    title: string;
    description: string;
    complete: boolean;
    final?: boolean;
}) {
    return (
        <div className="relative flex gap-4 pb-6">
            <div
                className={[
                    "relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    complete
                        ? "border-emerald-400 bg-emerald-400 text-black"
                        : "border-white/15 bg-[#09090b]",
                ].join(" ")}
            >
                {complete && (
                    <Check size={9} strokeWidth={3} />
                )}
            </div>

            <div className="-mt-1">
                <p
                    className={[
                        "text-xs font-medium",
                        final && complete
                            ? "text-emerald-400"
                            : "text-zinc-300",
                    ].join(" ")}
                >
                    {title}
                </p>

                <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                    {description}
                </p>
            </div>
        </div>
    );
}