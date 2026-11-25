import type { Period } from "@/lib/analytics";
import type { Review } from "@/lib/types";

/** Distribution of scores 1–10 for the selected period. */
export function SentimentMix({ reviews, period }: { reviews: Review[]; period: Period }) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: 0 }));
  for (const r of reviews) {
    const s = Math.min(10, Math.max(1, Math.round(r.score)));
    buckets[s - 1].count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section className="card flex flex-col p-6">
      <h2 className="text-base font-semibold tracking-tight">Score distribution</h2>
      <p className="mt-0.5 text-sm text-slate-500">How guests scored their stay {period.label}</p>
      <div className="mt-5 flex flex-1 items-end gap-1.5" style={{ minHeight: 150 }}>
        {buckets.map((b) => {
          const color = b.score >= 8 ? "bg-emerald-500" : b.score >= 6 ? "bg-amber-400" : "bg-rose-500";
          return (
            <div key={b.score} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="tabular text-[11px] font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
                {b.count}
              </span>
              <div
                className={`w-full rounded-md ${color} transition-all`}
                style={{ height: `${Math.max((b.count / max) * 100, b.count ? 4 : 1.5)}%`, opacity: b.count ? 1 : 0.25 }}
                title={`${b.count} review${b.count === 1 ? "" : "s"} scored ${b.score}`}
              />
              <span className="tabular text-xs text-slate-400">{b.score}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-rose-500" /> Negative 1–5
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-amber-400" /> Mixed 6–7
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-emerald-500" /> Positive 8–10
        </span>
      </div>
    </section>
  );
}
