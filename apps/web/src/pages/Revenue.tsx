import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { useEffect, useState } from "react";

import { Sidebar } from "../components/Sidebar";

import {
  getRecoveryMetrics,
  type RecoveryMetrics,
} from "../api/recovery";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function percentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function Revenue() {
  const [metrics, setMetrics] =
    useState<RecoveryMetrics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function loadMetrics() {
    try {
      setLoading(true);
      setError(null);

      const data =
        await getRecoveryMetrics();

      setMetrics(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load metrics.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#09090b]">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="h-8 w-64 animate-pulse rounded bg-white/5" />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex min-h-screen bg-[#09090b]">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="mx-auto max-w-[1200px]">
            <h1 className="text-2xl font-semibold text-white">
              Revenue Intelligence
            </h1>

            <div className="mt-8 rounded-xl border border-red-500/15 bg-red-500/5 p-5 text-sm text-red-300">
              {error ?? "No metrics available."}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const {
    cases,
    revenue,
    performance,
  } = metrics;

  const recoveryPercentage =
    revenue.amountAtRisk > 0
      ? revenue.amountRecovered /
        revenue.amountAtRisk
      : 0;

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="min-w-0 flex-1">
        {/* HEADER */}

        <header className="flex h-18 items-center justify-between border-b border-white/8 px-5 sm:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              RecoverAI
            </p>

            <h1 className="mt-1 text-sm font-medium text-white">
              Revenue Intelligence
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live recovery data
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
          {/* HERO */}

          <section className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-[0.15em] text-zinc-600">
              Recovery performance
            </p>

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                  Turn failed payments into recovered revenue.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  RecoverAI continuously measures revenue at
                  risk, recovery actions, and confirmed
                  financial outcomes.
                </p>
              </div>

              <button
                onClick={loadMetrics}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </section>

          {/* TOP METRICS */}

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Wallet}
              label="Revenue at risk"
              value={formatINR(
                revenue.amountAtRisk,
              )}
              description={`${cases.total} recovery cases`}
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Revenue recovered"
              value={formatINR(
                revenue.amountRecovered,
              )}
              description={`${cases.recovered} cases recovered`}
              positive
            />

            <MetricCard
              icon={TrendingUp}
              label="Revenue recovery rate"
              value={percentage(
                performance.revenueRecoveryRate,
              )}
              description="Recovered / total revenue at risk"
              positive
            />
          </section>

          {/* RECOVERY PROGRESS */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-medium text-white">
                  Revenue recovered
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Confirmed financial recovery across all cases
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {percentage(
                    recoveryPercentage,
                  )}
                </p>

                <p className="text-[10px] text-zinc-600">
                  of at-risk revenue
                </p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    recoveryPercentage * 100,
                    100,
                  )}%`,
                }}
              />
            </div>

            <div className="mt-4 flex justify-between text-xs">
              <span className="text-emerald-400">
                {formatINR(
                  revenue.amountRecovered,
                )}{" "}
                recovered
              </span>

              <span className="text-zinc-600">
                {formatINR(
                  revenue.amountOutstanding,
                )}{" "}
                outstanding
              </span>
            </div>
          </section>

          {/* PERFORMANCE GRID */}

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* CASE OUTCOMES */}

            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
              <div className="mb-6">
                <p className="text-sm font-medium text-white">
                  Case outcomes
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Current state of the recovery pipeline
                </p>
              </div>

              <div className="space-y-3">
                <OutcomeRow
                  icon={CheckCircle2}
                  label="Recovered"
                  value={cases.recovered}
                  total={cases.total}
                  positive
                />

                <OutcomeRow
                  icon={RefreshCw}
                  label="Retrying"
                  value={cases.retrying}
                  total={cases.total}
                />

                <OutcomeRow
                  icon={Clock3}
                  label="Manual review"
                  value={cases.manualReview}
                  total={cases.total}
                />

                <OutcomeRow
                  icon={XCircle}
                  label="Exhausted"
                  value={cases.exhausted}
                  total={cases.total}
                />

                <OutcomeRow
                  icon={Activity}
                  label="Open"
                  value={cases.open}
                  total={cases.total}
                />
              </div>
            </div>

            {/* EXECUTION PERFORMANCE */}

            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
              <div className="mb-6">
                <p className="text-sm font-medium text-white">
                  Agent performance
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Recovery execution and financial outcomes
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PerformanceCard
                  label="Recovery rate"
                  value={percentage(
                    performance.recoveryRate,
                  )}
                />

                <PerformanceCard
                  label="Revenue recovery"
                  value={percentage(
                    performance.revenueRecoveryRate,
                  )}
                />

                <PerformanceCard
                  label="Total attempts"
                  value={performance.totalAttempts}
                />

                <PerformanceCard
                  label="Successful attempts"
                  value={
                    performance.successfulAttempts
                  }
                />
              </div>

              <div className="mt-3 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.035] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={15}
                    className="text-emerald-400"
                  />

                  <span className="text-xs font-medium text-emerald-300">
                    Execution reliability
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-white">
                      {percentage(
                        performance.retrySuccessRate,
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-zinc-600">
                      retry execution success
                    </p>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-emerald-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* RECOVERY FUNNEL */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <div className="mb-7">
              <p className="text-sm font-medium text-white">
                Recovery funnel
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                How RecoverAI converts payment failures into recovered revenue
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <FunnelStep
                number="01"
                title="Failure"
                value={cases.total}
                description="payments at risk"
              />

              <FunnelStep
                number="02"
                title="Diagnosis"
                value={cases.total}
                description="AI analyzed"
              />

              <FunnelStep
                number="03"
                title="Intervention"
                value={performance.totalAttempts}
                description="recovery attempts"
              />

              <FunnelStep
                number="04"
                title="Capture"
                value={cases.recovered}
                description="successful recoveries"
              />

              <FunnelStep
                number="05"
                title="Revenue"
                value={formatINR(
                  revenue.amountRecovered,
                )}
                description="confirmed recovered"
                final
              />
            </div>
          </section>

          {/* FOOTNOTE */}

          <div className="mt-8 flex items-center gap-2 text-[10px] text-zinc-700">
            <ShieldCheck size={12} />

            <span>
              Recovery metrics are derived from persisted
              payment, recovery case, attempt, and audit data.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  positive = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
          {label}
        </span>

        <Icon
          size={16}
          className={
            positive
              ? "text-emerald-400"
              : "text-zinc-600"
          }
        />
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function OutcomeRow({
  icon: Icon,
  label,
  value,
  total,
  positive = false,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  total: number;
  positive?: boolean;
}) {
  const percentageValue =
    total === 0
      ? 0
      : (value / total) * 100;

  return (
    <div className="rounded-lg border border-white/6 bg-black/20 p-3">
      <div className="flex items-center gap-3">
        <Icon
          size={15}
          className={
            positive
              ? "text-emerald-400"
              : "text-zinc-600"
          }
        />

        <span className="flex-1 text-xs text-zinc-400">
          {label}
        </span>

        <span className="text-xs font-medium text-white">
          {value}
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-white/20"
          style={{
            width: `${percentageValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function PerformanceCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
        {label}
      </p>

      <p className="mt-3 text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function FunnelStep({
  number,
  title,
  value,
  description,
  final = false,
}: {
  number: string;
  title: string;
  value: number | string;
  description: string;
  final?: boolean;
}) {
  return (
    <div
      className={[
        "relative rounded-xl border p-4",
        final
          ? "border-emerald-500/15 bg-emerald-500/[0.035]"
          : "border-white/6 bg-black/20",
      ].join(" ")}
    >
      <p className="font-mono text-[10px] text-zinc-700">
        {number}
      </p>

      <p className="mt-4 text-xs text-zinc-500">
        {title}
      </p>

      <p
        className={[
          "mt-2 text-xl font-semibold",
          final
            ? "text-emerald-400"
            : "text-white",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] text-zinc-700">
        {description}
      </p>
    </div>
  );
}