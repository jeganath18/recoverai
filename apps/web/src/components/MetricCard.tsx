import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent?: "default" | "green" | "amber";
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent = "default",
}: MetricCardProps) {
  const iconClasses = {
    default:
      "border-white/10 bg-white/5 text-zinc-400",
    green:
      "border-emerald-500/15 bg-emerald-500/8 text-emerald-400",
    amber:
      "border-amber-500/15 bg-amber-500/8 text-amber-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-white/15 hover:bg-white/[0.04]">
      <div className="mb-6 flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </span>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${iconClasses[accent]}`}
        >
          <Icon size={16} />
        </div>
      </div>

      <div className="text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {description}
      </div>
    </div>
  );
}