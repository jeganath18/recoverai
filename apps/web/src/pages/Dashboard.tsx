import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  getRecoveryMetrics,
  type RecoveryMetrics,
} from "../api/recovery";

import { MetricCard } from "../components/MetricCard";
import { Sidebar } from "../components/Sidebar";
import {
  formatINR,
  formatPercent,
} from "../utils";

export function Dashboard() {
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

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <header className="flex h-18 items-center justify-between border-b border-white/8 px-5 sm:px-8">
          <div>
            <h1 className="text-sm font-medium text-white">
              Revenue Recovery
            </h1>

            <p className="mt-0.5 text-xs text-zinc-600">
              Autonomous recovery operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400">
                Systems operational
              </span>
            </div>

            <button
              onClick={loadMetrics}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition hover:bg-white/5 hover:text-white"
              title="Refresh metrics"
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
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <section className="mb-10">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Live recovery intelligence
                </span>
              </div>

              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Turn failed payments into
                recovered revenue.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                RecoverAI diagnoses payment failures,
                selects bounded recovery actions, and
                measures the money actually recovered.
              </p>
            </div>

            {metrics && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Revenue at Risk"
                  value={formatINR(
                    metrics.revenue.amountAtRisk,
                  )}
                  description="Across active recovery cases"
                  icon={WalletCards}
                />

                <MetricCard
                  label="Revenue Recovered"
                  value={formatINR(
                    metrics.revenue.amountRecovered,
                  )}
                  description="Confirmed captured revenue"
                  icon={CheckCircle2}
                  accent="green"
                />

                <MetricCard
                  label="Recovery Rate"
                  value={formatPercent(
                    metrics.performance
                      .revenueRecoveryRate,
                  )}
                  description="Recovered / revenue at risk"
                  icon={ArrowUpRight}
                  accent="green"
                />

                <MetricCard
                  label="Active Cases"
                  value={String(
                    metrics.cases.retrying +
                      metrics.cases.outreach,
                  )}
                  description="Currently being recovered"
                  icon={Clock3}
                  accent="amber"
                />
              </div>
            )}
          </section>

          {metrics && (
            <>
              <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                  <div className="mb-8">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Recovery pipeline
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      Cases moving through autonomous recovery
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      [
                        "Recovered",
                        metrics.cases.recovered,
                        "text-emerald-400",
                      ],
                      [
                        "Retrying",
                        metrics.cases.retrying,
                        "text-blue-400",
                      ],
                      [
                        "Outreach",
                        metrics.cases.outreach,
                        "text-amber-400",
                      ],
                      [
                        "Review",
                        metrics.cases.manualReview,
                        "text-orange-400",
                      ],
                      [
                        "Exhausted",
                        metrics.cases.exhausted,
                        "text-red-400",
                      ],
                    ].map(
                      ([label, value, color]) => (
                        <div
                          key={String(label)}
                          className="rounded-lg border border-white/6 bg-black/20 p-4"
                        >
                          <div
                            className={`text-2xl font-semibold ${color}`}
                          >
                            {String(value)}
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            {label}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                    Revenue outcome
                  </p>

                  <div className="mt-8">
                    <div className="mb-2 flex items-end justify-between">
                      <span className="text-xs text-zinc-600">
                        Recovered
                      </span>

                      <span className="text-sm font-medium text-emerald-400">
                        {formatPercent(
                          metrics.performance
                            .revenueRecoveryRate,
                        )}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{
                          width: `${Math.min(
                            metrics.performance
                              .revenueRecoveryRate *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-5 flex justify-between text-xs">
                      <span className="text-zinc-500">
                        {formatINR(
                          metrics.revenue.amountRecovered,
                        )}{" "}
                        recovered
                      </span>

                      <span className="text-zinc-600">
                        {formatINR(
                          metrics.revenue.amountOutstanding,
                        )}{" "}
                        outstanding
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Agent activity
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      Current recovery engine state
                    </p>
                  </div>

                  <div className="text-xs text-zinc-600">
                    {metrics.cases.total} total cases
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ActivityRow
                    label="Cases recovered"
                    value={metrics.cases.recovered}
                    icon={<CheckCircle2 size={16} />}
                  />

                  <ActivityRow
                    label="Awaiting retry"
                    value={metrics.cases.retrying}
                    icon={<RefreshCw size={16} />}
                  />

                  <ActivityRow
                    label="Requires attention"
                    value={
                      metrics.cases.manualReview +
                      metrics.cases.exhausted
                    }
                    icon={
                      <AlertTriangle size={16} />
                    }
                  />
                </div>
              </section>
            </>
          )}

          {!metrics && loading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-36 animate-pulse rounded-xl border border-white/8 bg-white/[0.025]"
                  />
                ),
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ActivityRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-zinc-500">
          {icon}
        </span>

        <span className="text-xs text-zinc-500">
          {label}
        </span>
      </div>

      <span className="text-sm font-medium text-zinc-200">
        {value}
      </span>
    </div>
  );
}