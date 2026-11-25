import clsx from "clsx";
import { AlertTriangle, MessageSquareText, Star, ThumbsDown, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { LOW_SAMPLE, stats, topicStats, type Period } from "@/lib/analytics";
import { formatRange } from "@/lib/dates";
import type { TopicId } from "@/lib/topics";
import type { Review } from "@/lib/types";
import { Delta, fmt, SENTIMENT_STYLE } from "./ui";

function Kpi({
  icon,
  label,
  value,
  unit,
  delta,
  footer,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  tone?: "default" | "bad";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={clsx("card group flex flex-col p-5 text-left", onClick && "transition hover:-translate-y-0.5 hover:shadow-lg")}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className={clsx("grid size-7 place-items-center rounded-lg", tone === "bad" ? "bg-rose-50 text-rose-600" : "bg-azure-50 text-azure-600")}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tabular text-4xl font-semibold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      <div className="mt-2 min-h-6">{delta}</div>
      {footer && <div className="mt-auto border-t border-slate-100 pt-3 text-xs text-slate-500">{footer}</div>}
    </Tag>
  );
}

export function KpiCards({
  current,
  previous,
  period,
  onTopic,
}: {
  current: Review[];
  previous: Review[];
  period: Period;
  onTopic: (t: TopicId) => void;
}) {
  const cur = stats(current);
  const prev = stats(previous);
  const compare = period.preset !== "all" && prev.count > 0;
  const topIssue = topicStats(current)
    .filter((t) => t.negativeMentions > 0)
    .sort((a, b) => b.negativeMentions - a.negativeMentions)[0];
  const low = cur.count > 0 && cur.count < LOW_SAMPLE;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
        <span className="font-medium text-white">{period.label[0].toUpperCase() + period.label.slice(1)}</span>
        <span className="text-white/40">·</span>
        <span>{formatRange(period.from, period.to)}</span>
        {compare && (
          <>
            <span className="text-white/40">·</span>
            <span className="text-white/60">compared with {period.previous.label}</span>
          </>
        )}
        {low && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-200">
            <AlertTriangle className="size-3.5" /> small sample
          </span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Star className="size-4" />}
          label="Average rating"
          value={fmt.score(cur.average)}
          unit="/ 10"
          delta={
            compare && (
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <Delta value={cur.average !== null && prev.average !== null ? cur.average - prev.average : null} format={(v) => v.toFixed(1)} />
                vs {fmt.score(prev.average)} {period.previous.label}
              </span>
            )
          }
          footer={<SentimentBar positive={cur.positive} neutral={cur.neutral} negative={cur.negative} />}
        />
        <Kpi
          icon={<MessageSquareText className="size-4" />}
          label="Reviews"
          value={fmt.int(cur.count)}
          delta={
            compare && (
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <Delta value={cur.count - prev.count} format={(v) => String(Math.round(v))} threshold={0.5} goodWhen="neither" />
                vs {prev.count} {period.previous.label}
              </span>
            )
          }
          footer={
            <span>
              {cur.positive} positive · {cur.neutral} mixed · {cur.negative} negative
            </span>
          }
        />
        <Kpi
          icon={<ThumbsDown className="size-4" />}
          label="Negative reviews"
          tone="bad"
          value={fmt.pct(cur.negativeShare)}
          delta={
            compare && (
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <Delta
                  value={cur.negativeShare !== null && prev.negativeShare !== null ? (cur.negativeShare - prev.negativeShare) * 100 : null}
                  format={(v) => `${Math.round(v)} pts`}
                  goodWhen="down"
                  threshold={0.5}
                />
                vs {fmt.pct(prev.negativeShare)} {period.previous.label}
              </span>
            )
          }
          footer={<span>Scored below 6 out of 10</span>}
        />
        <Kpi
          icon={<TriangleAlert className="size-4" />}
          label="Top complaint"
          tone="bad"
          onClick={topIssue ? () => onTopic(topIssue.id) : undefined}
          value={topIssue ? <span className="text-2xl leading-10">{topIssue.label}</span> : <span className="text-2xl leading-10 text-slate-400">None</span>}
          delta={
            topIssue && (
              <span className="text-xs text-slate-500">
                in <b className="font-semibold text-rose-600">{fmt.pct(topIssue.negativeShare)}</b> of negative reviews ({topIssue.negativeMentions} of {cur.negative})
              </span>
            )
          }
          footer={topIssue ? <span className="text-azure-600 group-hover:underline">Read these reviews →</span> : <span>No negative reviews in this period</span>}
        />
      </div>
    </div>
  );
}

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative;
  if (!total) return <span>No reviews in this period</span>;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        {(
          [
            ["positive", positive],
            ["neutral", neutral],
            ["negative", negative],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className={SENTIMENT_STYLE[k].dot} style={{ width: `${(v / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between">
        <span>{Math.round((positive / total) * 100)}% positive</span>
        <span>{Math.round((negative / total) * 100)}% negative</span>
      </div>
    </div>
  );
}
