import clsx from "clsx";
import { X } from "lucide-react";
import { useState } from "react";
import { stats, topicStats, type Period } from "@/lib/analytics";
import { TOPIC_BY_ID, type TopicId } from "@/lib/topics";
import type { Review } from "@/lib/types";
import { TOPIC_COLORS } from "./TrendChart";
import { Delta, Segmented } from "./ui";

export function TopicBreakdown({
  current,
  previous,
  period,
  selected,
  onSelect,
  className,
}: {
  current: Review[];
  previous: Review[];
  period: Period;
  selected: TopicId | null;
  onSelect: (t: TopicId | null) => void;
  className?: string;
}) {
  const [view, setView] = useState<"complaints" | "praise">("complaints");
  const cur = stats(current);
  const prevStats = stats(previous);
  const prevTopics = new Map(topicStats(previous).map((t) => [t.id, t]));
  const compare = period.preset !== "all" && prevStats.negative >= 2;

  const rows = topicStats(current)
    .map((t) => {
      const share = view === "complaints" ? t.negativeShare : t.praiseShare;
      const count = view === "complaints" ? t.negativeMentions : t.praiseMentions;
      const prev = prevTopics.get(t.id);
      const prevShare = view === "complaints" ? prev?.negativeShare : prev?.praiseShare;
      return { ...t, share, count, prevShare };
    })
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0) || b.issueMentions - a.issueMentions);
  const base = view === "complaints" ? cur.negative : cur.positive;

  return (
    <section className={clsx("card flex flex-col p-6", className)}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Topics</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {view === "complaints"
              ? `Share of the ${base} negative review${base === 1 ? "" : "s"} ${period.label} mentioning each topic`
              : `Share of the ${base} positive review${base === 1 ? "" : "s"} ${period.label} praising each topic`}
          </p>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { id: "complaints", label: "Complaints" },
            { id: "praise", label: "Praise" },
          ]}
        />
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-azure-50 px-2.5 py-1 text-xs font-medium text-azure-600 hover:bg-azure-100"
        >
          Showing {TOPIC_BY_ID[selected].label.toLowerCase()} reviews <X className="size-3.5" />
        </button>
      )}

      <ul className="mt-4 space-y-1">
        {rows.map((r) => {
          const active = selected === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : r.id)}
                title={TOPIC_BY_ID[r.id].description}
                className={clsx(
                  "w-full rounded-xl px-3 py-2.5 text-left transition",
                  active ? "bg-azure-50 ring-1 ring-azure-200" : "hover:bg-slate-50",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    <i className="size-2 rounded-full" style={{ background: TOPIC_COLORS[r.id] }} />
                    {r.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {compare && view === "complaints" && r.share !== null && r.prevShare != null && (
                      <Delta value={(r.share - r.prevShare) * 100} format={(v) => `${Math.round(v)}`} goodWhen="down" threshold={1} suffix="pts" />
                    )}
                    <span className="tabular w-10 text-right font-semibold text-slate-900">
                      {r.share === null ? "–" : `${Math.round(r.share * 100)}%`}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(r.share ?? 0) * 100}%`,
                        background: view === "complaints" ? "#f43f5e" : "#10b981",
                        opacity: active || !selected ? 1 : 0.45,
                      }}
                    />
                  </div>
                  <span className="tabular w-16 text-right text-xs text-slate-400">
                    {r.count} of {base}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto pt-4 text-xs leading-relaxed text-slate-400">
        Keyword-based: a review counts toward a topic when the guest&apos;s{" "}
        {view === "complaints" ? "“didn’t like” text" : "“liked” text"} mentions it. One review can
        mention several topics, so percentages don&apos;t add up to 100%.
      </p>
    </section>
  );
}
