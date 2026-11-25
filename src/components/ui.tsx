import clsx from "clsx";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Sentiment } from "@/lib/types";

export function scoreColor(score: number | null): string {
  if (score == null) return "bg-slate-100 text-slate-500";
  if (score >= 8) return "bg-emerald-500 text-white";
  if (score >= 6) return "bg-amber-400 text-amber-950";
  return "bg-rose-500 text-white";
}

export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={clsx(
        "tabular inline-flex shrink-0 items-center justify-center rounded-lg font-semibold",
        scoreColor(score),
        size === "sm" && "h-6 min-w-8 px-1.5 text-xs",
        size === "md" && "h-8 min-w-10 px-2 text-sm",
        size === "lg" && "h-11 min-w-14 px-2.5 text-lg",
      )}
    >
      {score == null ? "–" : score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}
    </span>
  );
}

export const SENTIMENT_STYLE: Record<Sentiment, { dot: string; chip: string; bar: string }> = {
  positive: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "#10b981" },
  neutral: { dot: "bg-amber-400", chip: "bg-amber-50 text-amber-800 ring-amber-200", bar: "#fbbf24" },
  negative: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200", bar: "#f43f5e" },
};

/**
 * Change indicator. `goodWhen` says which direction is good news — for
 * "% negative" a drop is good, for average rating a rise is good.
 */
export function Delta({
  value,
  format,
  goodWhen = "up",
  suffix,
  dark = false,
  threshold = 0.05,
}: {
  value: number | null;
  format: (v: number) => string;
  goodWhen?: "up" | "down" | "neither";
  suffix?: string;
  dark?: boolean;
  threshold?: number;
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className={clsx("text-xs", dark ? "text-white/50" : "text-slate-400")}>no comparison</span>;
  }
  const flat = Math.abs(value) < threshold;
  const good = flat || goodWhen === "neither" ? null : (value > 0) === (goodWhen === "up");
  const Icon = flat ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={clsx(
        "tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
        good === null && (dark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600"),
        good === true && (dark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"),
        good === false && (dark ? "bg-rose-400/15 text-rose-300" : "bg-rose-50 text-rose-700"),
      )}
    >
      <Icon className="size-3.5" />
      {flat ? "flat" : `${value > 0 ? "+" : "−"}${format(Math.abs(value))}`}
      {suffix && <span className="font-normal opacity-75">&nbsp;{suffix}</span>}
    </span>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx(
            "rounded-lg font-medium transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const fmt = {
  score: (v: number | null) => (v == null ? "–" : v.toFixed(1)),
  pct: (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)}%`),
  int: (v: number) => v.toLocaleString("en-AU"),
};
