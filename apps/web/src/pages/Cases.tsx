import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Search,
    ShieldAlert,
    WalletCards,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    getRecoveryCases,
    type RecoveryCase,
} from "../api/recovery";

import { Sidebar } from "../components/Sidebar";

import {
    formatINR,
    formatPercent,
} from "../utils";

function statusConfig(status: string) {
    switch (status) {
        case "RECOVERED":
            return {
                label: "Recovered",
                className:
                    "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
                icon: CheckCircle2,
            };

        case "RETRYING":
            return {
                label: "Retrying",
                className:
                    "border-blue-500/20 bg-blue-500/8 text-blue-400",
                icon: RefreshCw,
            };

        case "MANUAL_REVIEW":
            return {
                label: "Manual review",
                className:
                    "border-amber-500/20 bg-amber-500/8 text-amber-400",
                icon: ShieldAlert,
            };

        case "EXHAUSTED":
            return {
                label: "Exhausted",
                className:
                    "border-red-500/20 bg-red-500/8 text-red-400",
                icon: AlertTriangle,
            };

        case "OUTREACH":
            return {
                label: "Outreach",
                className:
                    "border-amber-500/20 bg-amber-500/8 text-amber-400",
                icon: Clock3,
            };

        default:
            return {
                label: status,
                className:
                    "border-white/10 bg-white/5 text-zinc-400",
                icon: Clock3,
            };
    }
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const config = statusConfig(status);
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${config.className}`}
        >
            <Icon size={11} />
            {config.label}
        </span>
    );
}

export function Cases() {
    const [cases, setCases] = useState<
        RecoveryCase[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState("ALL");

    async function loadCases() {
        try {
            setLoading(true);
            setError(null);

            const result =
                await getRecoveryCases();

            setCases(result.cases);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load recovery cases.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCases();
    }, []);

    const filteredCases = useMemo(() => {
        return cases.filter((item) => {
            const matchesFilter =
                filter === "ALL" ||
                item.status === filter;

            const query =
                search.toLowerCase();

            const matchesSearch =
                !query ||
                item.id
                    .toLowerCase()
                    .includes(query) ||
                item.payment.razorpayId
                    .toLowerCase()
                    .includes(query) ||
                item.failureReason
                    ?.toLowerCase()
                    .includes(query);

            return (
                matchesFilter &&
                matchesSearch
            );
        });
    }, [cases, filter, search]);

    return (
        <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
            <Sidebar />

            <main className="min-w-0 flex-1">
                <header className="flex h-18 items-center justify-between border-b border-white/8 px-5 sm:px-8">
                    <div>
                        <h1 className="text-sm font-medium text-white">
                            Recovery Cases
                        </h1>

                        <p className="mt-0.5 text-xs text-zinc-600">
                            Monitor revenue moving through recovery
                        </p>
                    </div>

                    <button
                        onClick={loadCases}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                    >
                        <RefreshCw
                            size={15}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                    </button>
                </header>

                <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
                    <div className="mb-8">
                        <div className="mb-3 flex items-center gap-2">
                            <WalletCards
                                size={18}
                                className="text-emerald-400"
                            />

                            <span className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                                Revenue operations
                            </span>
                        </div>

                        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                            Recovery cases
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                            Every failed payment becomes a bounded,
                            auditable recovery workflow.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full max-w-md">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                            />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Search cases or payments..."
                                className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.025] pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-white/15"
                            />
                        </div>

                        <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/8 bg-white/[0.02] p-1">
                            {[
                                "ALL",
                                "RECOVERED",
                                "RETRYING",
                                "OUTREACH",
                                "MANUAL_REVIEW",
                                "EXHAUSTED",
                            ].map((value) => (
                                <button
                                    key={value}
                                    onClick={() =>
                                        setFilter(value)
                                    }
                                    className={[
                                        "whitespace-nowrap rounded-md px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] transition",
                                        filter === value
                                            ? "bg-white/8 text-white"
                                            : "text-zinc-600 hover:text-zinc-300",
                                    ].join(" ")}
                                >
                                    {value === "ALL"
                                        ? "All"
                                        : value.replace(
                                            "_",
                                            " ",
                                        )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
                        <div className="hidden grid-cols-[1.3fr_1.4fr_1fr_1.2fr_1fr_1fr_0.9fr] border-b border-white/8 px-5 py-3 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600 lg:grid">
                            <span>Case</span>
                            <span>Payment</span>
                            <span>At risk</span>
                            <span>Diagnosis</span>
                            <span>Action</span>
                            <span>Attempts</span>
                            <span>Status</span>
                        </div>

                        {loading ? (
                            <div className="divide-y divide-white/6">
                                {Array.from({
                                    length: 6,
                                }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-20 animate-pulse bg-white/[0.015]"
                                    />
                                ))}
                            </div>
                        ) : filteredCases.length === 0 ? (
                            <div className="flex min-h-60 items-center justify-center text-sm text-zinc-600">
                                No recovery cases found.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/6">
                                {filteredCases.map(
                                    (recoveryCase) => (
                                        <Link
                                            key={recoveryCase.id}
                                            to={`/cases/${recoveryCase.id}`}
                                            className="group grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition hover:bg-white/[0.025] lg:grid-cols-[1.3fr_1.4fr_1fr_1.2fr_1fr_1fr_0.9fr] lg:items-center"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-zinc-300">
                                                        {recoveryCase.id.slice(
                                                            -10,
                                                        )}
                                                    </span>

                                                    <ArrowRight
                                                        size={12}
                                                        className="text-zinc-700 transition group-hover:text-emerald-400"
                                                    />
                                                </div>

                                                <div className="mt-1 text-[10px] text-zinc-700">
                                                    {new Date(
                                                        recoveryCase.updatedAt,
                                                    ).toLocaleString()}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="font-mono text-[11px] text-zinc-400">
                                                    {recoveryCase.payment.razorpayId}
                                                </div>

                                                <div className="mt-1 text-[10px] text-zinc-700">
                                                    Original payment
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {formatINR(
                                                        recoveryCase.amountAtRisk,
                                                    )}
                                                </div>

                                                {recoveryCase.amountRecovered >
                                                    0 && (
                                                        <div className="mt-1 text-[10px] text-emerald-400">
                                                            {formatINR(
                                                                recoveryCase.amountRecovered,
                                                            )}{" "}
                                                            recovered
                                                        </div>
                                                    )}
                                            </div>

                                            <div>
                                                <div className="text-xs font-medium text-zinc-300">
                                                    {recoveryCase.recommendedAction ===
                                                        "RETRY_PAYMENT"
                                                        ? "TIMEOUT"
                                                        : recoveryCase.recommendedAction ===
                                                            "CUSTOMER_OUTREACH"
                                                            ? "Customer action required"
                                                            : recoveryCase.recommendedAction ===
                                                                "STOP_AND_REVIEW"
                                                                ? "Fraud risk"
                                                                : "Unclassified"}
                                                </div>

                                                <div className="mt-1 max-w-44 truncate text-[10px] text-zinc-600">
                                                    {recoveryCase.failureReason ??
                                                        "No failure reason"}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-xs text-zinc-400">
                                                    {recoveryCase.recommendedAction ??
                                                        "—"}
                                                </span>
                                            </div>

                                            <div className="text-xs text-zinc-500">
                                                {recoveryCase.retryAttempts || recoveryCase.outreachAttempts}
                                                /2 retries
                                            </div>

                                            <div>
                                                <StatusBadge
                                                    status={
                                                        recoveryCase.status
                                                    }
                                                />
                                            </div>
                                        </Link>
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}