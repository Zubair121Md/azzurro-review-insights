import { describe, expect, it } from "vitest";
import { buildInsights, dataQuality, inRange, resolvePeriod, stats, topicStats, trend } from "../src/lib/analytics";
import { sydneyDay, weekStart } from "../src/lib/dates";
import { sentimentForScore } from "../src/lib/sentiment";
import { classifyReview } from "../src/lib/topics";
import type { Review } from "../src/lib/types";

let n = 0;
function review(reviewedAt: string, score: number, disliked: string | null = null, liked: string | null = null): Review {
  const base = {
    propertyId: "potts-point" as const,
    reviewId: `r${n++}`,
    score,
    title: null,
    liked,
    disliked,
    reviewedAt,
    checkIn: null,
    checkOut: null,
    nights: null,
    roomName: null,
    travellerType: null,
    guestName: null,
    guestCountry: null,
    guestCountryCode: null,
    language: "en",
    hotelReply: null,
    helpfulVotes: 0,
  };
  return { ...base, sentiment: sentimentForScore(score), ...classifyReview(base) };
}

describe("dates", () => {
  it("uses Sydney calendar days", () => {
    // 20:00 UTC on 23 Nov is 07:00 on 24 Nov in Sydney (AEDT, UTC+11)
    expect(sydneyDay("2026-11-23T20:00:00Z")).toBe("2026-11-24");
  });

  it("starts weeks on Monday", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23"); // Wednesday
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // Sunday
    expect(weekStart("2026-11-23")).toBe("2026-11-23"); // Monday
  });
});

describe("resolvePeriod", () => {
  it("compares this week with the whole of last week", () => {
    const p = resolvePeriod("this-week", "2026-11-25");
    expect(p).toMatchObject({ from: "2026-11-23", to: "2026-11-25" });
    expect(p.previous).toMatchObject({ from: "2026-11-16", to: "2026-11-22" });
  });

  it("compares trailing windows with the same length before them", () => {
    const p = resolvePeriod("30d", "2026-11-25");
    expect(p).toMatchObject({ from: "2026-10-27", to: "2026-11-25" });
    expect(p.previous).toMatchObject({ from: "2026-09-27", to: "2026-10-26" });
  });
});

describe("stats and topics", () => {
  const reviews = [
    review("2026-11-24T01:00:00Z", 4, "Dirty bathroom"),
    review("2026-11-24T02:00:00Z", 3, "Rude reception staff and the room was dirty"),
    review("2026-11-24T03:00:00Z", 5, "Too noisy"),
    review("2026-11-24T04:00:00Z", 2, "Overpriced"),
    review("2026-11-24T05:00:00Z", 6, "Small room"),
    review("2026-11-24T06:00:00Z", 9, null, "Great location"),
  ];

  it("computes average and sentiment split", () => {
    const s = stats(reviews);
    expect(s.count).toBe(6);
    expect(s.average).toBeCloseTo(29 / 6);
    expect([s.positive, s.neutral, s.negative]).toEqual([1, 1, 4]);
  });

  it("computes the share of negative reviews mentioning each topic", () => {
    const clean = topicStats(reviews).find((t) => t.id === "cleanliness")!;
    expect(clean.negativeMentions).toBe(2);
    expect(clean.negativeShare).toBe(0.5);
  });

  it("writes plain-English insights", () => {
    const period = resolvePeriod("this-week", "2026-11-25");
    const insights = buildInsights(reviews, [], period);
    expect(insights.map((i) => i.text)).toContain("50% of negative reviews this week mentioned cleanliness (2 of 4).");
  });

  it("flags small samples", () => {
    const period = resolvePeriod("this-week", "2026-11-25");
    const insights = buildInsights(reviews.slice(0, 2), [], period);
    expect(insights[0].tone).toBe("warning");
  });

  it("filters by Sydney date range", () => {
    expect(inRange(reviews, "2026-11-24", "2026-11-24")).toHaveLength(6);
    expect(inRange(reviews, "2026-11-25", "2026-11-30")).toHaveLength(0);
  });

  it("buckets trends by week", () => {
    const t = trend(reviews, "2026-11-23", "2026-11-25");
    expect(t.unit).toBe("week");
    expect(t.points.at(-1)).toMatchObject({ key: "2026-11-23", count: 6 });
    expect(t.points.length).toBeGreaterThanOrEqual(12);
  });
});

describe("dataQuality", () => {
  it("reports coverage against Booking's own count and topic hit rates", () => {
    const rs = [
      review("2026-11-20T01:00:00Z", 3, "Dirty floors"),
      review("2026-11-20T02:00:00Z", 4, "Il manque quelque chose"),
      review("2026-11-20T03:00:00Z", 9, null, "Great"),
    ];
    rs[1].language = "fr";
    const q = dataQuality(rs, [{ id: "potts-point", bookingReviewCount: 4 }]);
    expect(q.coverage[0]).toEqual({ propertyId: "potts-point", stored: 3, listed: 4 });
    expect(q.topicCoverage).toMatchObject({ english: 1, other: 0, englishCount: 1, otherCount: 1 });
  });

  it("points out negative reviews without a hotel reply", () => {
    const rs = [review("2026-11-24T01:00:00Z", 3, "Dirty"), review("2026-11-24T02:00:00Z", 2, "Rude staff")];
    rs[1].hotelReply = "Sorry to hear this";
    const insights = buildInsights(rs, [], resolvePeriod("this-week", "2026-11-25"));
    expect(insights.find((i) => i.needsReply)?.text).toBe("1 of 2 negative reviews this week has no reply from the hotel on Booking.com yet.");
  });
});
