"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildInsights,
  filterReviews,
  inRange,
  PRESETS,
  resolvePeriod,
  reviewDay,
  trend,
  type PresetId,
} from "@/lib/analytics";
import { sydneyDay } from "@/lib/dates";
import type { PropertyId } from "@/lib/properties";
import type { TopicId } from "@/lib/topics";
import type { Sentiment, Snapshot } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { Header } from "./Header";
import { InsightsPanel } from "./InsightsPanel";
import { KpiCards } from "./KpiCards";
import { Methodology } from "./Methodology";
import { PropertyCards } from "./PropertyCards";
import { ReviewFeed } from "./ReviewFeed";
import { SentimentMix } from "./SentimentMix";
import { TopicBreakdown } from "./TopicBreakdown";
import { TrendChart } from "./TrendChart";

export type PropertyFilter = "all" | PropertyId;

export interface FeedFilter {
  sentiment: Sentiment | "all";
  topic: TopicId | null;
  search: string;
}

const PRESET_IDS = new Set<string>([...PRESETS.map((p) => p.id), "custom"]);

function readUrlState() {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const preset = q.get("period");
  return {
    property: (q.get("property") as PropertyFilter | null) ?? "all",
    preset: (preset && PRESET_IDS.has(preset) ? preset : "this-week") as PresetId,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
  };
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyFilter>("all");
  const [preset, setPreset] = useState<PresetId>("this-week");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>();
  const [feed, setFeed] = useState<FeedFilter>({ sentiment: "all", topic: null, search: "" });
  const [showMethod, setShowMethod] = useState(false);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/reviews.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Snapshot>;
      })
      .then((data) => {
        // Filters can be shared as a link, e.g. ?property=potts-point&period=30d
        const s = readUrlState();
        if (s) {
          setProperty(s.property);
          setPreset(s.preset);
          if (s.from && s.to) setCustom({ from: s.from, to: s.to });
        }
        setToday(sydneyDay(new Date()));
        setSnapshot(data);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const q = new URLSearchParams();
    if (property !== "all") q.set("property", property);
    if (preset !== "this-week") q.set("period", preset);
    if (preset === "custom" && custom) {
      q.set("from", custom.from);
      q.set("to", custom.to);
    }
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [snapshot, property, preset, custom]);

  const view = useMemo(() => {
    if (!snapshot || !today) return null;
    const all = snapshot.reviews;
    const earliest = all.length ? reviewDay(all[all.length - 1]) : undefined;
    const period = resolvePeriod(preset, today, custom, earliest);
    const scoped = property === "all" ? all : filterReviews(all, { properties: [property] });
    const current = inRange(scoped, period.from, period.to);
    const previous = inRange(scoped, period.previous.from, period.previous.to);
    const byProperty = snapshot.properties.map((p) => ({
      id: p.id,
      name: p.shortName,
      reviews: inRange(all.filter((r) => r.propertyId === p.id), period.from, period.to),
      previous: inRange(all.filter((r) => r.propertyId === p.id), period.previous.from, period.previous.to),
    }));
    const insights = buildInsights(current, previous, period, {
      byProperty: property === "all" ? byProperty : undefined,
    });
    const series = trend(scoped, period.from, period.to);
    return { period, scoped, current, previous, byProperty, insights, series };
  }, [snapshot, property, preset, custom, today]);

  const selectTopic = (topic: TopicId | null) => {
    setFeed((f) => ({ ...f, topic, sentiment: topic && f.sentiment === "positive" ? "all" : f.sentiment }));
    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen">
      <section className="hero-bg pb-28 text-white">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <Header snapshot={snapshot} onOpenMethod={() => setShowMethod(true)} />
          <FilterBar
            properties={snapshot?.properties ?? []}
            property={property}
            onProperty={setProperty}
            preset={preset}
            onPreset={setPreset}
            range={view ? { from: view.period.from, to: view.period.to } : undefined}
            onCustom={(c) => {
              setCustom(c);
              setPreset("custom");
            }}
            today={today ?? ""}
          />
        </div>
      </section>

      <main className="mx-auto -mt-24 max-w-7xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        {error && (
          <div className="card border-rose-200 bg-rose-50 p-6 text-rose-800">
            Could not load review data ({error}). Run <code className="font-mono">npm run scrape</code> to generate{" "}
            <code className="font-mono">public/data/reviews.json</code>.
          </div>
        )}
        {!view && !error && <LoadingState />}
        {view && snapshot && (
          <>
            <KpiCards current={view.current} previous={view.previous} period={view.period} onTopic={selectTopic} />

            <div className="grid gap-6 lg:grid-cols-3">
              <InsightsPanel
                insights={view.insights}
                period={view.period}
                onTopic={selectTopic}
                onProperty={(id) => setProperty(id)}
                className="lg:col-span-2"
              />
              <SentimentMix reviews={view.current} period={view.period} />
            </div>

            <PropertyCards
              properties={snapshot.properties}
              byProperty={view.byProperty}
              allReviews={snapshot.reviews}
              selected={property}
              onSelect={(id) => setProperty((p) => (p === id ? "all" : id))}
              period={view.period}
              today={today!}
            />

            <TrendChart series={view.series} period={view.period} />

            <div className="grid gap-6 lg:grid-cols-5">
              <TopicBreakdown
                current={view.current}
                previous={view.previous}
                period={view.period}
                selected={feed.topic}
                onSelect={selectTopic}
                className="lg:col-span-2"
              />
              <ReviewFeed
                reviews={view.current}
                properties={snapshot.properties}
                filter={feed}
                onFilter={setFeed}
                period={view.period}
                onWiden={() => setPreset("30d")}
                className="lg:col-span-3"
              />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>Review data collected from public Booking.com property pages. Scores are out of 10.</p>
          <button type="button" onClick={() => setShowMethod(true)} className="font-medium text-azure-600 hover:underline">
            How the numbers are calculated
          </button>
        </div>
      </footer>

      <Methodology open={showMethod} onClose={() => setShowMethod(false)} snapshot={snapshot} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
      <div className="skeleton h-64" />
      <div className="skeleton h-80" />
    </div>
  );
}
