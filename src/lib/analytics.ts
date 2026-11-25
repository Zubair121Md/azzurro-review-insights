import { addDays, addMonths, daysBetween, formatDay, formatMonth, monthStart, sydneyDay, weekStart } from "./dates";
import type { PropertyId } from "./properties";
import { TOPIC_BY_ID, TOPICS, type TopicId } from "./topics";
import type { Review } from "./types";

/** Below this many reviews, percentages swing wildly — the UI flags them. */
export const LOW_SAMPLE = 5;

export type PresetId = "this-week" | "last-week" | "30d" | "90d" | "12m" | "all" | "custom";

export interface Period {
  preset: PresetId;
  from: string; // inclusive, Sydney calendar day
  to: string; // inclusive
  label: string; // "this week"
  previous: { from: string; to: string; label: string };
}

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
  { id: "all", label: "All time" },
];

export function resolvePeriod(
  preset: PresetId,
  today: string,
  custom?: { from: string; to: string },
  earliest?: string,
): Period {
  const thisMonday = weekStart(today);
  const trailing = (days: number, label: string, prevLabel: string): Period => {
    const from = addDays(today, -(days - 1));
    return {
      preset,
      from,
      to: today,
      label,
      previous: { from: addDays(from, -days), to: addDays(from, -1), label: prevLabel },
    };
  };
  switch (preset) {
    case "this-week":
      return {
        preset,
        from: thisMonday,
        to: today,
        label: "this week",
        previous: { from: addDays(thisMonday, -7), to: addDays(thisMonday, -1), label: "last week" },
      };
    case "last-week":
      return {
        preset,
        from: addDays(thisMonday, -7),
        to: addDays(thisMonday, -1),
        label: "last week",
        previous: { from: addDays(thisMonday, -14), to: addDays(thisMonday, -8), label: "the week before" },
      };
    case "30d":
      return trailing(30, "in the last 30 days", "the previous 30 days");
    case "90d":
      return trailing(90, "in the last 90 days", "the previous 90 days");
    case "12m":
      return trailing(365, "in the last 12 months", "the 12 months before");
    case "all": {
      const from = earliest ?? addDays(today, -365);
      return { preset, from, to: today, label: "overall", previous: { from: addDays(from, -1), to: addDays(from, -1), label: "before" } };
    }
    case "custom": {
      const from = custom?.from ?? addDays(today, -29);
      const to = custom?.to ?? today;
      const len = daysBetween(from, to) + 1;
      return {
        preset,
        from,
        to,
        label: `between ${formatDay(from)} and ${formatDay(to)}`,
        previous: { from: addDays(from, -len), to: addDays(from, -1), label: "the period before" },
      };
    }
  }
}

export const reviewDay = (r: Review) => sydneyDay(r.reviewedAt);

export function inRange(reviews: Review[], from: string, to: string): Review[] {
  return reviews.filter((r) => {
    const d = reviewDay(r);
    return d >= from && d <= to;
  });
}

export function filterReviews(reviews: Review[], opts: { properties?: PropertyId[] }): Review[] {
  const props = opts.properties?.length ? new Set(opts.properties) : null;
  return props ? reviews.filter((r) => props.has(r.propertyId)) : reviews;
}

export interface Stats {
  count: number;
  average: number | null;
  positive: number;
  neutral: number;
  negative: number;
  negativeShare: number | null;
  positiveShare: number | null;
}

export function stats(reviews: Review[]): Stats {
  const count = reviews.length;
  let sum = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const r of reviews) {
    sum += r.score;
    if (r.sentiment === "positive") positive++;
    else if (r.sentiment === "negative") negative++;
    else neutral++;
  }
  return {
    count,
    average: count ? sum / count : null,
    positive,
    neutral,
    negative,
    negativeShare: count ? negative / count : null,
    positiveShare: count ? positive / count : null,
  };
}

export interface TopicStat {
  id: TopicId;
  label: string;
  /** Negative reviews that complain about this topic. */
  negativeMentions: number;
  /** ...as a share of all negative reviews in the period. */
  negativeShare: number | null;
  /** Any review (whatever its score) that lists this topic as a dislike. */
  issueMentions: number;
  issueShare: number | null;
  /** Positive reviews that praise this topic. */
  praiseMentions: number;
  praiseShare: number | null;
  /** Average score of reviews complaining about this topic. */
  averageWhenRaised: number | null;
}

export function topicStats(reviews: Review[]): TopicStat[] {
  const negatives = reviews.filter((r) => r.sentiment === "negative");
  const positives = reviews.filter((r) => r.sentiment === "positive");
  return TOPICS.map((t) => {
    const neg = negatives.filter((r) => r.issues.includes(t.id)).length;
    const raised = reviews.filter((r) => r.issues.includes(t.id));
    const praise = positives.filter((r) => r.praise.includes(t.id)).length;
    return {
      id: t.id,
      label: t.label,
      negativeMentions: neg,
      negativeShare: negatives.length ? neg / negatives.length : null,
      issueMentions: raised.length,
      issueShare: reviews.length ? raised.length / reviews.length : null,
      praiseMentions: praise,
      praiseShare: positives.length ? praise / positives.length : null,
      averageWhenRaised: raised.length ? raised.reduce((s, r) => s + r.score, 0) / raised.length : null,
    };
  });
}

export interface TrendPoint {
  key: string;
  label: string;
  from: string;
  to: string;
  count: number;
  average: number | null;
  positive: number;
  neutral: number;
  negative: number;
  /** Per-topic share of reviews raising it as an issue in this bucket. */
  topics: Record<TopicId, number | null>;
}

/** Weekly buckets for ranges up to ~6 months, monthly beyond that. */
export function trend(reviews: Review[], from: string, to: string): { unit: "week" | "month"; points: TrendPoint[] } {
  const unit = daysBetween(from, to) > 190 ? "month" : "week";
  const starts: string[] = [];
  if (unit === "week") {
    // Always show at least 12 weeks so a single-week view still has context.
    let s = weekStart(daysBetween(from, to) < 77 ? addDays(to, -77) : from);
    while (s <= to) {
      starts.push(s);
      s = addDays(s, 7);
    }
  } else {
    let s = monthStart(from);
    while (s <= to) {
      starts.push(s);
      s = addMonths(s, 1);
    }
  }
  const buckets = new Map<string, Review[]>(starts.map((s) => [s, []]));
  for (const r of reviews) {
    const d = reviewDay(r);
    const key = unit === "week" ? weekStart(d) : monthStart(d);
    buckets.get(key)?.push(r);
  }
  return {
    unit,
    points: starts.map((s) => {
      const rs = buckets.get(s)!;
      const st = stats(rs);
      const end = unit === "week" ? addDays(s, 6) : addDays(addMonths(s, 1), -1);
      const topics = Object.fromEntries(
        TOPICS.map((t) => [t.id, rs.length ? rs.filter((r) => r.issues.includes(t.id)).length / rs.length : null]),
      ) as Record<TopicId, number | null>;
      return {
        key: s,
        label: unit === "week" ? formatDay(s) : formatMonth(s),
        from: s,
        to: end,
        count: st.count,
        average: st.average,
        positive: st.positive,
        neutral: st.neutral,
        negative: st.negative,
        topics,
      };
    }),
  };
}

export type InsightTone = "good" | "bad" | "neutral" | "warning";
export interface Insight {
  tone: InsightTone;
  text: string;
  topic?: TopicId;
  propertyId?: PropertyId;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => x.toFixed(1);

/**
 * Turns the numbers into short sentences an ops manager can act on, e.g.
 * "40% of negative reviews this week mentioned cleanliness (4 of 10)".
 */
export function buildInsights(
  current: Review[],
  previous: Review[],
  period: Period,
  opts: { byProperty?: { id: PropertyId; name: string; reviews: Review[] }[] } = {},
): Insight[] {
  const out: Insight[] = [];
  const cur = stats(current);
  const prev = stats(previous);
  const hasPrev = period.preset !== "all" && prev.count > 0;

  if (!cur.count) {
    return [{ tone: "neutral", text: `No reviews were posted ${period.label} for this selection.` }];
  }

  if (cur.count < LOW_SAMPLE) {
    out.push({
      tone: "warning",
      text: `Only ${cur.count} review${cur.count === 1 ? "" : "s"} ${period.label} — read the percentages below as a signal, not a trend.`,
    });
  }

  if (cur.average !== null) {
    if (hasPrev && prev.average !== null) {
      const diff = cur.average - prev.average;
      const dir = Math.abs(diff) < 0.05 ? "flat on" : diff > 0 ? `up ${one(diff)} from` : `down ${one(Math.abs(diff))} from`;
      out.push({
        tone: Math.abs(diff) < 0.05 ? "neutral" : diff > 0 ? "good" : "bad",
        text: `Average rating ${period.label} is ${one(cur.average)}/10 from ${cur.count} reviews — ${dir} ${period.previous.label} (${one(prev.average)}).`,
      });
    } else {
      out.push({ tone: "neutral", text: `Average rating ${period.label} is ${one(cur.average)}/10 from ${cur.count} reviews.` });
    }
  }

  const curTopics = topicStats(current);
  const prevTopics = new Map(topicStats(previous).map((t) => [t.id, t]));

  if (cur.negative > 0) {
    const ranked = curTopics.filter((t) => t.negativeMentions > 0).sort((a, b) => b.negativeMentions - a.negativeMentions);
    for (const t of ranked.slice(0, 2)) {
      const before = prevTopics.get(t.id);
      let tail = "";
      if (hasPrev && before?.negativeShare != null && prev.negative >= 2) {
        const delta = t.negativeShare! - before.negativeShare;
        if (Math.abs(delta) >= 0.05) tail = `, ${delta > 0 ? "up" : "down"} from ${pct(before.negativeShare)} ${period.previous.label}`;
      }
      out.push({
        tone: "bad",
        topic: t.id,
        text: `${pct(t.negativeShare!)} of negative reviews ${period.label} mentioned ${TOPIC_BY_ID[t.id].label.toLowerCase()} (${t.negativeMentions} of ${cur.negative})${tail}.`,
      });
    }
  } else {
    out.push({ tone: "good", text: `No negative reviews (below 6/10) ${period.label}.` });
  }

  if (hasPrev && current.length >= LOW_SAMPLE && previous.length >= LOW_SAMPLE) {
    const risers = curTopics
      .map((t) => ({ t, delta: (t.issueShare ?? 0) - (prevTopics.get(t.id)?.issueShare ?? 0) }))
      .filter((x) => x.delta >= 0.1 && x.t.issueMentions >= 2)
      .sort((a, b) => b.delta - a.delta);
    const r = risers[0];
    if (r && !out.some((o) => o.topic === r.t.id)) {
      out.push({
        tone: "bad",
        topic: r.t.id,
        text: `Complaints about ${r.t.label.toLowerCase()} are rising: raised in ${pct(r.t.issueShare!)} of all reviews ${period.label} vs ${pct(prevTopics.get(r.t.id)?.issueShare ?? 0)} ${period.previous.label}.`,
      });
    }
  }

  if (cur.positive > 0) {
    const top = [...curTopics].sort((a, b) => b.praiseMentions - a.praiseMentions)[0];
    if (top && top.praiseMentions > 0) {
      out.push({
        tone: "good",
        topic: top.id,
        text: `Most praised: ${top.label.toLowerCase()} — mentioned in ${pct(top.praiseShare!)} of positive reviews (${top.praiseMentions} of ${cur.positive}).`,
      });
    }
  }

  const props = (opts.byProperty ?? []).map((p) => ({ ...p, st: stats(p.reviews) })).filter((p) => p.st.count >= 2);
  if (props.length >= 2) {
    const sorted = [...props].sort((a, b) => a.st.average! - b.st.average!);
    const low = sorted[0];
    const high = sorted.at(-1)!;
    if (high.st.average! - low.st.average! >= 0.5) {
      out.push({
        tone: "neutral",
        propertyId: low.id,
        text: `${low.name} is the lowest-rated property ${period.label} (${one(low.st.average!)} from ${low.st.count} reviews); ${high.name} is the highest (${one(high.st.average!)}).`,
      });
    }
  }

  return out;
}
