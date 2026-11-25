import { BookOpenText, RefreshCw } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/dates";
import type { Snapshot } from "@/lib/types";

export function Header({ snapshot, now, onOpenMethod }: { snapshot: Snapshot | null; now: number | null; onOpenMethod: () => void }) {
  const lastScrape = snapshot?.properties
    .map((p) => p.lastScrapedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  // Collection is meant to run daily; older data than this means the job has stopped.
  const stale = !!lastScrape && !!now && now - new Date(lastScrape).getTime() > 48 * 3_600_000;
  const failing = snapshot?.runs.filter((r, i, all) => all.findIndex((x) => x.propertyId === r.propertyId) === i && r.status === "failed") ?? [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-azure-400 to-indigo-500 text-lg font-bold shadow-lg shadow-azure-500/30">
          A
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-azure-100/70 uppercase">Azzurro Hotels</p>
          <h1 className="text-xl font-semibold tracking-tight">Guest Review Insights</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {snapshot && (
          <span
            className="glass inline-flex items-center gap-2 px-3 py-1.5 text-white/80"
            title={lastScrape ? `Last collected ${formatDateTime(lastScrape)} (Sydney time)` : undefined}
          >
            <span className={`size-2 rounded-full ${failing.length || stale ? "bg-amber-400" : "bg-emerald-400"} shadow-[0_0_0_3px_rgba(16,185,129,0.15)]`} />
            {snapshot.reviews.length.toLocaleString("en-AU")} reviews
            {lastScrape && (
              <>
                <span className="text-white/30">·</span>
                <RefreshCw className="size-3.5" /> updated {relativeTime(lastScrape, now ?? undefined)}
              </>
            )}
            {stale && <span className="text-amber-300">· data may be out of date</span>}
            {failing.length > 0 && <span className="text-amber-300">· {failing.length} source issue{failing.length > 1 ? "s" : ""}</span>}
          </span>
        )}
        <button
          type="button"
          onClick={onOpenMethod}
          className="glass inline-flex items-center gap-2 px-3 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <BookOpenText className="size-4" /> Method & limits
        </button>
      </div>
    </div>
  );
}
