import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Sidebar } from "../components/Sidebar";

import {
  getRecoveryBatch,
  type RecoveryBatch as RecoveryBatchData,
} from "../api/recovery";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function BatchRecovery() {
  const [data, setData] =
    useState<RecoveryBatchData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  async function load() {
    setLoading(true);

    try {
      const result =
        await getRecoveryBatch();

      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen bg-[#09090b]">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="h-8 w-64 animate-pulse rounded bg-white/5" />
        </main>
      </div>
    );
  }

  const { batch, cases } = data;

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <header className="flex h-18 items-center justify-between border-b border-white/8 px-5 sm:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              RecoverAI
            </p>

            <h1 className="mt-1 text-sm font-medium text-white">
              Batch Recovery
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Recovery engine active
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
          {/* HERO */}

          <section className="mb-8">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-600">
              Batch recovery operation
            </p>

            <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                  Recover revenue at scale.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Every failed payment is diagnosed,
                  evaluated against recovery policy,
                  executed within defined limits, and
                  reconciled against confirmed payment
                  events.
                </p>
              </div>

              <button
                onClick={load}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <RefreshCw size={13} />
                Refresh batch
              </button>
            </div>
          </section>

          {/* MONEY */}

          <section className="grid gap-4 md:grid-cols-3">
            <Metric
              icon={Wallet}
              label="Revenue at risk"
              value={formatINR(
                batch.amountAtRisk,
              )}
            />

            <Metric
              icon={CircleDollarSign}
              label="Recovered"
              value={formatINR(
                batch.amountRecovered,
              )}
              positive
            />

            <Metric
              icon={Sparkles}
              label="Recovery rate"
              value={percent(
                batch.revenueRecoveryRate,
              )}
              positive
            />
          </section>

          {/* RECOVERY ENGINE */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <div className="mb-7">
              <p className="text-sm font-medium text-white">
                Recovery engine
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Automated decision → execution → financial
                confirmation
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <Pipeline
                icon={CircleDollarSign}
                title="Detect"
                value={batch.totalCases}
                description="payments at risk"
              />

              <Pipeline
                icon={Bot}
                title="Diagnose"
                value={batch.totalCases}
                description="AI decisions"
              />

              <Pipeline
                icon={ShieldCheck}
                title="Authorize"
                value={batch.totalAttempts}
                description="policy-approved actions"
              />

              <Pipeline
                icon={RefreshCw}
                title="Execute"
                value={
                  batch.successfulAttempts
                }
                description="successful executions"
              />

              <Pipeline
                icon={CheckCircle2}
                title="Recover"
                value={
                  batch.recoveredCases
                }
                description="confirmed recoveries"
                final
              />
            </div>
          </section>

          {/* MONEY BAR */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Financial outcome
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Confirmed against captured payment events
                </p>
              </div>

              <p className="text-lg font-semibold text-emerald-400">
                {percent(
                  batch.revenueRecoveryRate,
                )}
              </p>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{
                  width: `${Math.min(
                    batch.revenueRecoveryRate *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>

            <div className="mt-4 flex justify-between text-xs">
              <span className="text-emerald-400">
                {formatINR(
                  batch.amountRecovered,
                )}{" "}
                recovered
              </span>

              <span className="text-zinc-600">
                {formatINR(
                  batch.amountOutstanding,
                )}{" "}
                remaining
              </span>
            </div>
          </section>

          {/* CASE TABLE */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025]">
            <div className="border-b border-white/8 p-6">
              <p className="text-sm font-medium text-white">
                Batch cases
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {batch.totalCases} recovery cases processed
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                    <th className="px-6 py-3">
                      Case
                    </th>

                    <th className="px-4 py-3">
                      Risk
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                    <th className="px-4 py-3">
                      Attempts
                    </th>

                    <th className="px-4 py-3">
                      Outcome
                    </th>

                    <th className="px-6 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {cases.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono text-[10px] text-zinc-400">
                          {item.id}
                        </p>

                        <p className="mt-1 text-[10px] text-zinc-700">
                          {item.failureReason ??
                            "Payment failure"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-xs text-zinc-400">
                        {formatINR(
                          item.amountAtRisk,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-[10px] text-zinc-400">
                          {item.recommendedAction ??
                            "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-zinc-400">
                        {item.attempts.length}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.status ===
                            "RECOVERED"
                              ? "text-[10px] uppercase tracking-[0.08em] text-emerald-400"
                              : "text-[10px] uppercase tracking-[0.08em] text-zinc-500"
                          }
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/cases/${item.id}`}
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-white"
                        >
                          View
                          <ArrowRight
                            size={11}
                          />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FOOTER */}

          <div className="mt-8 flex items-center gap-2 text-[10px] text-zinc-700">
            <FileCheck2 size={12} />

            <span>
              Financial recovery is only counted after
              payment capture and reconciliation.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  positive = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
      <div className="flex justify-between">
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
    </div>
  );
}

function Pipeline({
  icon: Icon,
  title,
  value,
  description,
  final = false,
}: {
  icon: typeof Wallet;
  title: string;
  value: number;
  description: string;
  final?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        final
          ? "border-emerald-500/15 bg-emerald-500/[0.035]"
          : "border-white/6 bg-black/20"
      }`}
    >
      <Icon
        size={16}
        className={
          final
            ? "text-emerald-400"
            : "text-zinc-600"
        }
      />

      <p className="mt-4 text-xs text-zinc-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-semibold ${
          final
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] text-zinc-700">
        {description}
      </p>
    </div>
  );
}