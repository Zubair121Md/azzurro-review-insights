"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Period, TrendPoint } from "@/lib/analytics";
import { formatDay } from "@/lib/dates";
import { TOPICS, type TopicId } from "@/lib/topics";
import { Segmented, SectionTitle } from "./ui";

export const TOPIC_COLORS: Record<TopicId, string> = {
  cleanliness: "#f43f5e",
  "check-in": "#8b5cf6",
  staff: "#0ea5e9",
  noise: "#f59e0b",
  facilities: "#14b8a6",
  food: "#a16207",
  location: "#22c55e",
  room: "#6366f1",
  value: "#ec4899",
};

export function TrendChart({ series, period }: { series: { unit: "week" | "month"; points: TrendPoint[] }; period: Period }) {
  const [mode, setMode] = useState<"sentiment" | "topics">("sentiment");
  const data = series.points.map((p) => ({
    ...p,
    average: p.average === null ? null : Math.round(p.average * 10) / 10,
    ...Object.fromEntries(TOPICS.map((t) => [t.id, p.topics[t.id] === null ? null : Math.round(p.topics[t.id]! * 100)])),
  }));
  const highlight = series.points.filter((p) => p.to >= period.from && p.from <= period.to);

  return (
    <section className="card p-6">
      <SectionTitle
        title={mode === "sentiment" ? "Positive vs negative over time" : "Complaint topics over time"}
        subtitle={
          mode === "sentiment"
            ? `Reviews per ${series.unit} by sentiment, with the average score`
            : `Share of reviews raising each topic as a dislike, per ${series.unit}`
        }
        right={
          <Segmented
            value={mode}
            onChange={setMode}
            size="sm"
            options={[
              { id: "sentiment", label: "Sentiment" },
              { id: "topics", label: "Topics" },
            ]}
          />
        }
      />
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
            {highlight.length > 0 && highlight.length < data.length && (
              <ReferenceArea
                x1={highlight[0].label}
                x2={highlight.at(-1)!.label}
                yAxisId={mode === "sentiment" ? "count" : "pct"}
                fill="#1f95f5"
                fillOpacity={0.06}
              />
            )}
            {mode === "sentiment" ? (
              <>
                <YAxis yAxisId="count" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="score" orientation="right" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<SentimentTooltip unit={series.unit} />} cursor={{ fill: "#f1f5f9" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="count" dataKey="positive" name="Positive" stackId="s" fill="#10b981" maxBarSize={36} />
                <Bar yAxisId="count" dataKey="neutral" name="Mixed" stackId="s" fill="#fbbf24" maxBarSize={36} />
                <Bar yAxisId="count" dataKey="negative" name="Negative" stackId="s" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line yAxisId="score" dataKey="average" name="Average score" stroke="#0a1f3f" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls type="monotone" />
              </>
            ) : (
              <>
                <YAxis yAxisId="pct" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<TopicTooltip unit={series.unit} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {TOPICS.map((t) => (
                  <Line
                    key={t.id}
                    yAxisId="pct"
                    dataKey={t.id}
                    name={t.label}
                    stroke={TOPIC_COLORS[t.id]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    type="monotone"
                  />
                ))}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type TooltipProps = { active?: boolean; payload?: { payload: TrendPoint & Record<string, number | null> }[]; unit: string };

function TooltipShell({ point, unit, children }: { point: TrendPoint; unit: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-semibold text-slate-800">
        {unit === "week" ? `Week of ${formatDay(point.from, true)}` : point.label}
      </p>
      {children}
    </div>
  );
}

function SentimentTooltip({ active, payload, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell point={p} unit={unit}>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-slate-600">
        <dt>Average score</dt>
        <dd className="tabular text-right font-semibold text-slate-900">{p.average ?? "–"}</dd>
        <dt>Reviews</dt>
        <dd className="tabular text-right">{p.count}</dd>
        <dt className="text-emerald-600">Positive</dt>
        <dd className="tabular text-right">{p.positive}</dd>
        <dt className="text-amber-600">Mixed</dt>
        <dd className="tabular text-right">{p.neutral}</dd>
        <dt className="text-rose-600">Negative</dt>
        <dd className="tabular text-right">{p.negative}</dd>
      </dl>
    </TooltipShell>
  );
}

function TopicTooltip({ active, payload, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rows = TOPICS.map((t) => ({ t, v: p[t.id] as number | null }))
    .filter((r) => r.v !== null)
    .sort((a, b) => (b.v ?? 0) - (a.v ?? 0));
  return (
    <TooltipShell point={p} unit={unit}>
      <p className="mb-1.5 text-slate-500">{p.count} reviews</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-slate-600">
        {rows.map(({ t, v }) => (
          <div key={t.id} className="contents">
            <dt className="flex items-center gap-1.5">
              <i className="size-2 rounded-full" style={{ background: TOPIC_COLORS[t.id] }} />
              {t.label}
            </dt>
            <dd className="tabular text-right font-medium text-slate-900">{v}%</dd>
          </div>
        ))}
      </dl>
    </TooltipShell>
  );
}

