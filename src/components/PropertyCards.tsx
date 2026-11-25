"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { stats, topicStats, trend, type Period } from "@/lib/analytics";
import { addDays } from "@/lib/dates";
import type { PropertyId } from "@/lib/properties";
import type { PropertySnapshot, Review } from "@/lib/types";
import type { PropertyFilter } from "./Dashboard";
import { Delta, fmt, ScoreBadge, SectionTitle } from "./ui";

const SUBSCORE_ORDER = ["hotel_clean", "hotel_staff", "hotel_comfort", "hotel_services", "hotel_value", "hotel_location"];

export function PropertyCards({
  properties,
  byProperty,
  allReviews,
  selected,
  onSelect,
  period,
  today,
}: {
  properties: PropertySnapshot[];
  byProperty: { id: PropertyId; reviews: Review[]; previous: Review[] }[];
  allReviews: Review[];
  selected: PropertyFilter;
  onSelect: (id: PropertyId) => void;
  period: Period;
  today: string;
}) {
  return (
    <section>
      <SectionTitle
        title="By property"
        subtitle={`Ratings ${period.label}, with the 12-week trend and Booking.com's category scores`}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {properties.map((p) => {
          const bp = byProperty.find((b) => b.id === p.id)!;
          const cur = stats(bp.reviews);
          const prev = stats(bp.previous);
          const issue = topicStats(bp.reviews)
            .filter((t) => t.issueMentions > 0)
            .sort((a, b) => b.issueMentions - a.issueMentions)[0];
          const weekly = trend(
            allReviews.filter((r) => r.propertyId === p.id),
            addDays(today, -83),
            today,
          ).points.map((pt) => ({ k: pt.key, v: pt.average }));
          const subs = SUBSCORE_ORDER.map((k) => p.subscores.find((s) => s.key === k)).filter(Boolean) as PropertySnapshot["subscores"];
          const active = selected === p.id;
          const negatives = bp.reviews.filter((r) => r.sentiment === "negative");
          const replied = negatives.filter((r) => r.hotelReply).length;

          return (
            <article
              key={p.id}
              className={clsx(
                "card relative flex cursor-pointer flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg",
                active && "ring-2 ring-azure-500",
              )}
              onClick={() => onSelect(p.id)}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: p.accent }} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold tracking-tight">{p.shortName}</h3>
                  <p className="truncate text-xs text-slate-500">{p.name}</p>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  title="Overall Booking.com score"
                >
                  Booking {fmt.score(p.bookingScore)} <ExternalLink className="size-3" />
                </a>
              </div>

              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={cur.average === null ? null : Math.round(cur.average * 10) / 10} size="lg" />
                    <div className="text-xs leading-tight text-slate-500">
                      <div className="tabular font-medium text-slate-700">{cur.count} reviews</div>
                      <div>{period.label}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    {period.preset !== "all" && (
                      <Delta
                        value={cur.average !== null && prev.average !== null ? cur.average - prev.average : null}
                        format={(v) => v.toFixed(1)}
                        suffix={`vs ${period.previous.label}`}
                      />
                    )}
                  </div>
                </div>
                <div className="h-14 w-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weekly} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
                      <YAxis domain={[1, 10]} hide />
                      <Line type="monotone" dataKey="v" stroke={p.accent} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="-mt-1 text-right text-[10px] text-slate-400">12-week avg</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <dt className="text-slate-500">Negative</dt>
                  <dd className="tabular font-semibold text-slate-800">{fmt.pct(cur.negativeShare)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2" title="Negative reviews the hotel has replied to on Booking.com">
                  <dt className="text-slate-500">Replied</dt>
                  <dd className="tabular font-semibold text-slate-800">{negatives.length ? `${replied}/${negatives.length}` : "–"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <dt className="text-slate-500">Top issue</dt>
                  <dd className="truncate font-semibold text-slate-800">{issue ? issue.label : "–"}</dd>
                </div>
              </dl>

              {subs.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  {subs.map((s) => (
                    <div key={s.key} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 truncate text-slate-500">{s.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={clsx("h-full rounded-full", s.value >= 8 ? "bg-emerald-500" : s.value >= 7 ? "bg-azure-500" : s.value >= 6 ? "bg-amber-400" : "bg-rose-500")}
                          style={{ width: `${s.value * 10}%` }}
                        />
                      </div>
                      <span className="tabular w-7 text-right font-medium text-slate-700">{s.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
