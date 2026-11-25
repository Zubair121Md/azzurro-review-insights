"use client";

import clsx from "clsx";
import { ArrowDownWideNarrow, Frown, Languages, MessageCircleReply, Search, Smile, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Period } from "@/lib/analytics";
import { formatDay, sydneyDay } from "@/lib/dates";
import { highlightTopics, TOPIC_BY_ID, type TopicId } from "@/lib/topics";
import type { PropertySnapshot, Review, Sentiment } from "@/lib/types";
import type { FeedFilter } from "./Dashboard";
import { TOPIC_COLORS } from "./TrendChart";
import { ScoreBadge, Segmented, SENTIMENT_STYLE } from "./ui";

const PAGE = 12;
type Sort = "newest" | "lowest" | "highest";

export function ReviewFeed({
  reviews,
  properties,
  filter,
  onFilter,
  period,
  onWiden,
  className,
}: {
  reviews: Review[];
  properties: PropertySnapshot[];
  filter: FeedFilter;
  onFilter: (f: FeedFilter) => void;
  period: Period;
  onWiden: () => void;
  className?: string;
}) {
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(PAGE);
  const search = useDeferredValue(filter.search.trim().toLowerCase());
  const props = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const counts = useMemo(() => {
    const c = { all: reviews.length, positive: 0, neutral: 0, negative: 0 };
    for (const r of reviews) c[r.sentiment]++;
    return c;
  }, [reviews]);

  const shown = useMemo(() => {
    const out = reviews.filter((r) => {
      if (filter.sentiment !== "all" && r.sentiment !== filter.sentiment) return false;
      if (filter.topic && !r.issues.includes(filter.topic) && !r.praise.includes(filter.topic)) return false;
      if (search) {
        const hay = `${r.title ?? ""} ${r.liked ?? ""} ${r.disliked ?? ""} ${r.guestName ?? ""} ${r.roomName ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return out.sort((a, b) =>
      sort === "newest" ? b.reviewedAt.localeCompare(a.reviewedAt) : sort === "lowest" ? a.score - b.score || b.reviewedAt.localeCompare(a.reviewedAt) : b.score - a.score || b.reviewedAt.localeCompare(a.reviewedAt),
    );
  }, [reviews, filter.sentiment, filter.topic, search, sort]);

  const set = (patch: Partial<FeedFilter>) => {
    setLimit(PAGE);
    onFilter({ ...filter, ...patch });
  };

  return (
    <section id="reviews" className={clsx("card scroll-mt-6 p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Review feed</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {shown.length} of {reviews.length} reviews {period.label}
          </p>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search reviews…"
            className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none transition focus:border-azure-400 focus:bg-white focus:ring-4 focus:ring-azure-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={filter.sentiment}
          onChange={(s) => set({ sentiment: s })}
          size="sm"
          options={(["all", "negative", "neutral", "positive"] as const).map((s) => ({
            id: s,
            label: (
              <span className="flex items-center gap-1.5">
                {s !== "all" && <i className={clsx("size-1.5 rounded-full", SENTIMENT_STYLE[s].dot)} />}
                {s === "all" ? "All" : s === "neutral" ? "Mixed" : s[0].toUpperCase() + s.slice(1)}
                <span className="tabular text-slate-400">{counts[s]}</span>
              </span>
            ),
          }))}
        />
        {filter.topic && (
          <button
            type="button"
            onClick={() => set({ topic: null })}
            className="inline-flex items-center gap-1.5 rounded-full bg-azure-50 px-2.5 py-1 text-xs font-medium text-azure-600 ring-1 ring-azure-200 hover:bg-azure-100"
          >
            <i className="size-2 rounded-full" style={{ background: TOPIC_COLORS[filter.topic] }} />
            {TOPIC_BY_ID[filter.topic].label}
            <X className="size-3.5" />
          </button>
        )}
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowDownWideNarrow className="size-4" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg bg-transparent py-1 font-medium text-slate-700 outline-none">
            <option value="newest">Newest first</option>
            <option value="lowest">Lowest score first</option>
            <option value="highest">Highest score first</option>
          </select>
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {shown.slice(0, limit).map((r) => (
          <ReviewCard key={`${r.propertyId}:${r.reviewId}`} review={r} property={props.get(r.propertyId)} activeTopic={filter.topic} />
        ))}
        {shown.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No reviews match these filters.
            {reviews.length < 5 && (
              <button type="button" onClick={onWiden} className="ml-1 font-medium text-azure-600 hover:underline">
                Look at the last 30 days instead
              </button>
            )}
          </div>
        )}
      </div>
      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Show more ({shown.length - limit} left)
        </button>
      )}
    </section>
  );
}

function Highlighted({ text, topics, tone, activeTopic }: { text: string; topics: TopicId[]; tone: Sentiment; activeTopic: TopicId | null }) {
  const parts = highlightTopics(text, topics);
  return (
    <>
      {parts.map((p, i) =>
        p.topic ? (
          <mark
            key={i}
            className={clsx("topic", tone === "negative" ? "bg-rose-100/80" : "bg-emerald-100/80", activeTopic === p.topic && "ring-1 ring-current")}
            title={TOPIC_BY_ID[p.topic].label}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function ReviewCard({ review: r, property, activeTopic }: { review: Review; property?: PropertySnapshot; activeTopic: TopicId | null }) {
  const [showReply, setShowReply] = useState(false);
  const meta = [
    r.travellerType,
    r.roomName,
    r.nights ? `${r.nights} night${r.nights > 1 ? "s" : ""}` : null,
    r.checkIn ? `stayed ${formatDay(r.checkIn, true)}` : null,
  ].filter(Boolean);
  const topics = [...new Set([...r.issues, ...r.praise])];

  return (
    <article className="rounded-xl border border-slate-200/80 p-4 transition hover:border-slate-300">
      <div className="flex items-start gap-3">
        <ScoreBadge score={r.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="font-medium text-slate-900">{r.title ? `“${r.title}”` : <span className="text-slate-400">No headline</span>}</h3>
            <time className="tabular shrink-0 text-xs text-slate-400" dateTime={r.reviewedAt}>
              {formatDay(sydneyDay(r.reviewedAt), true)}
            </time>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {property && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <i className="size-1.5 rounded-full" style={{ background: property.accent }} />
                {property.shortName}
              </span>
            )}
            <span>
              {r.guestName ?? "Guest"}
              {r.guestCountry && ` · ${r.guestCountry}`}
            </span>
            {meta.length > 0 && <span className="text-slate-400">· {meta.join(" · ")}</span>}
            {r.language && r.language !== "en" && r.language !== "en-gb" && (
              <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 text-[10px] font-medium uppercase text-slate-500" title="Not in English — topics may be missed">
                <Languages className="size-3" />
                {r.language}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        {r.liked && (
          <p className="flex gap-2 text-slate-700">
            <Smile className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>
              <Highlighted text={r.liked} topics={r.praise} tone="positive" activeTopic={activeTopic} />
            </span>
          </p>
        )}
        {r.disliked && (
          <p className="flex gap-2 text-slate-700">
            <Frown className="mt-0.5 size-4 shrink-0 text-rose-500" />
            <span>
              <Highlighted text={r.disliked} topics={r.issues} tone="negative" activeTopic={activeTopic} />
            </span>
          </p>
        )}
        {!r.liked && !r.disliked && <p className="text-slate-400 italic">The guest left a score without comments.</p>}
      </div>

      {(topics.length > 0 || r.hotelReply) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {r.issues.map((t) => (
            <span key={`i-${t}`} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-100">
              {TOPIC_BY_ID[t].label}
            </span>
          ))}
          {r.praise
            .filter((t) => !r.issues.includes(t))
            .map((t) => (
              <span key={`p-${t}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                {TOPIC_BY_ID[t].label}
              </span>
            ))}
          {r.hotelReply && (
            <button
              type="button"
              onClick={() => setShowReply((s) => !s)}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <MessageCircleReply className="size-3.5" /> {showReply ? "Hide" : "Hotel"} reply
            </button>
          )}
        </div>
      )}
      {showReply && r.hotelReply && (
        <blockquote className="mt-3 rounded-lg border-l-2 border-azure-400 bg-azure-50/60 px-3 py-2 text-sm text-slate-600">{r.hotelReply}</blockquote>
      )}
      {!r.hotelReply && r.sentiment === "negative" && (
        <p className="mt-3 text-[11px] font-medium text-amber-700">No reply from the hotel yet</p>
      )}
    </article>
  );
}
