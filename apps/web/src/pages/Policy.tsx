import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import { useEffect, useState } from "react";

import { Sidebar } from "../components/Sidebar";

type Policy = {
  retry: {
    enabled: boolean;
    maxRetries: number;
    minimumConfidence: number;
    maximumAutoRetryAmount: number;
    maximumAutoRetryAmountINR: number;
  };

  fraud: {
    automaticRecovery: boolean;
    action: string;
  };

  escalation: {
    action: string;
    exhaustedRetries: string;
    highValuePayment: string;
    lowConfidence: string;
    fraudRisk: string;
  };

  financialConfirmation: {
    paymentCaptureRequired: boolean;
    reconciliationRequired: boolean;
  };

  idempotency: {
    enabled: boolean;
    strategy: string;
  };

  terminalStates: string[];
};

export function Policy() {
  const [policy, setPolicy] =
    useState<Policy | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/recovery/policy")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load policy",
          );
        }

        return response.json();
      })
      .then(setPolicy)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !policy) {
    return (
      <div className="flex min-h-screen bg-[#09090b]">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="h-8 w-64 animate-pulse rounded bg-white/5" />
        </main>
      </div>
    );
  }

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
              Policy & Guardrails
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Policy engine active
          </div>
        </header>

        <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8">
          {/* HERO */}

          <section className="mb-8">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-600">
              Controlled automation
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
              AI can recommend. Policy decides.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              RecoverAI places deterministic business
              rules between AI recommendations and
              financial execution.
            </p>
          </section>

          {/* RETRY POLICY */}

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <SectionHeader
              icon={ShieldCheck}
              title="Automatic retry"
              description="Rules governing when RecoverAI may retry a failed payment."
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RuleCard
                label="Automatic retry"
                value={
                  policy.retry.enabled
                    ? "ENABLED"
                    : "DISABLED"
                }
                enabled={policy.retry.enabled}
              />

              <RuleCard
                label="Maximum retries"
                value={policy.retry.maxRetries}
                enabled
              />

              <RuleCard
                label="Minimum confidence"
                value={`${(
                  policy.retry
                    .minimumConfidence * 100
                ).toFixed(0)}%`}
                enabled
              />

              <RuleCard
                label="Maximum auto-retry"
                value={`₹${policy.retry.maximumAutoRetryAmountINR.toLocaleString(
                  "en-IN",
                )}`}
                enabled
              />
            </div>
          </section>

          {/* SAFETY BOUNDARIES */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <SectionHeader
              icon={LockKeyhole}
              title="Safety boundaries"
              description="Conditions that automatically prevent autonomous recovery."
            />

            <div className="mt-6 space-y-3">
              <Boundary
                icon={AlertTriangle}
                title="Fraud risk"
                description="Fraud-risk payments cannot be automatically recovered."
                action="STOP_AND_REVIEW"
              />

              <Boundary
                icon={AlertTriangle}
                title="Low AI confidence"
                description={`Automatic retry requires at least ${(
                  policy.retry.minimumConfidence *
                  100
                ).toFixed(0)}% confidence.`}
                action="STOP_AND_REVIEW"
              />

              <Boundary
                icon={AlertTriangle}
                title="High-value payment"
                description={`Payments above ₹${policy.retry.maximumAutoRetryAmountINR.toLocaleString(
                  "en-IN",
                )} require manual review.`}
                action="STOP_AND_REVIEW"
              />

              <Boundary
                icon={XCircle}
                title="Invalid amount"
                description="Payments with zero or negative amounts cannot be recovered."
                action="STOP_AND_REVIEW"
              />
            </div>
          </section>

          {/* ESCALATION */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <SectionHeader
              icon={UserRoundCheck}
              title="Escalation"
              description="When automation stops, the case moves toward human review."
            />

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <EscalationCard
                title="Retry exhausted"
                value={
                  policy.escalation
                    .exhaustedRetries
                }
              />

              <EscalationCard
                title="High-value payment"
                value={
                  policy.escalation
                    .highValuePayment
                }
              />

              <EscalationCard
                title="Fraud / low confidence"
                value="MANUAL_REVIEW"
              />
            </div>
          </section>

          {/* EXECUTION SAFETY */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <SectionHeader
              icon={CheckCircle2}
              title="Financial confirmation"
              description="Revenue is not considered recovered until the payment is actually confirmed."
            />

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Confirmation
                title="Payment capture"
                enabled={
                  policy
                    .financialConfirmation
                    .paymentCaptureRequired
                }
              />

              <Confirmation
                title="Reconciliation"
                enabled={
                  policy
                    .financialConfirmation
                    .reconciliationRequired
                }
              />

              <Confirmation
                title="Idempotency"
                enabled={
                  policy.idempotency.enabled
                }
              />
            </div>
          </section>

          {/* TERMINAL STATES */}

          <section className="mt-6 rounded-xl border border-white/8 bg-white/[0.025] p-6">
            <SectionHeader
              icon={LockKeyhole}
              title="Terminal states"
              description="Once a recovery case reaches one of these states, no further automatic action is permitted."
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {policy.terminalStates.map(
                (state) => (
                  <span
                    key={state}
                    className="rounded-md border border-white/8 bg-black/20 px-3 py-2 font-mono text-[10px] text-zinc-400"
                  >
                    {state}
                  </span>
                ),
              )}
            </div>
          </section>

          {/* FOOTER */}

          <div className="mt-8 flex items-center gap-2 text-[10px] text-zinc-700">
            <ShieldCheck size={12} />

            <span>
              AI recommendations never bypass deterministic
              recovery policy.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg border border-white/8 bg-white/[0.035] p-2">
        <Icon
          size={15}
          className="text-zinc-500"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function RuleCard({
  label,
  value,
  enabled,
}: {
  label: string;
  value: string | number;
  enabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
          {label}
        </p>

        <span
          className={
            enabled
              ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
              : "h-1.5 w-1.5 rounded-full bg-red-400"
          }
        />
      </div>

      <p className="mt-4 text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function Boundary({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/6 bg-black/20 p-4">
      <Icon
        size={16}
        className="shrink-0 text-zinc-600"
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          {description}
        </p>
      </div>

      <span className="shrink-0 rounded-md border border-amber-500/10 bg-amber-500/[0.04] px-2 py-1 font-mono text-[9px] text-amber-400">
        {action}
      </span>
    </div>
  );
}

function EscalationCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600">
        {title}
      </p>

      <p className="mt-4 text-sm font-medium text-white">
        {value}
      </p>
    </div>
  );
}

function Confirmation({
  title,
  enabled,
}: {
  title: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.025] p-4">
      <CheckCircle2
        size={16}
        className={
          enabled
            ? "text-emerald-400"
            : "text-zinc-700"
        }
      />

      <span className="text-xs text-zinc-400">
        {title}
      </span>

      <span className="ml-auto text-[9px] uppercase tracking-[0.1em] text-emerald-400">
        Required
      </span>
    </div>
  );
}