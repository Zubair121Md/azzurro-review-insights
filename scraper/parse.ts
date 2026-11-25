import { z } from "zod";
import type { PropertyId } from "../src/lib/properties";
import type { StoredReview, Subscore } from "../src/lib/types";
import { LayoutChangedError } from "./errors";

/*
 * Only the fields we actually use are validated. Everything is lenient
 * (nullish) except the handful we can't work without: id, score and date.
 */
const ReviewCard = z.object({
  reviewUrl: z.string().min(4),
  reviewScore: z.number().min(0).max(10),
  reviewedDate: z.number().int().positive(),
  helpfulVotesCount: z.number().nullish(),
  textDetails: z
    .object({
      title: z.string().nullish(),
      positiveText: z.string().nullish(),
      negativeText: z.string().nullish(),
      lang: z.string().nullish(),
    })
    .nullish(),
  guestDetails: z
    .object({
      username: z.string().nullish(),
      countryName: z.string().nullish(),
      countryCode: z.string().nullish(),
      guestTypeTranslation: z.string().nullish(),
      anonymous: z.boolean().nullish(),
    })
    .nullish(),
  bookingDetails: z
    .object({
      checkinDate: z.string().nullish(),
      checkoutDate: z.string().nullish(),
      numNights: z.number().nullish(),
      customerType: z.string().nullish(),
      roomType: z.object({ name: z.string().nullish() }).nullish(),
    })
    .nullish(),
  partnerReply: z.object({ reply: z.string().nullish() }).passthrough().nullish(),
});

const RatingScore = z.object({
  name: z.string(),
  translation: z.string().nullish(),
  value: z.number(),
});

const ReviewListResponse = z.object({
  data: z.object({
    reviewListFrontend: z.object({
      reviewsCount: z.number(),
      reviewCard: z.array(z.unknown()),
      ratingScores: z.array(z.unknown()).nullish(),
    }),
  }),
});

export interface ParsedPage {
  totalReviews: number;
  reviews: StoredReview[];
  raw: Map<string, unknown>;
  subscores: Subscore[];
  rejected: number;
  rejectReasons: string[];
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

const clean = (s: string | null | undefined): string | null => {
  const t = s ? decodeEntities(s).replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]+\n/g, "\n").trim() : "";
  return t ? t : null;
};

export function parseReviewListResponse(json: unknown, propertyId: PropertyId): ParsedPage {
  const errors = (json as { errors?: { message?: string }[] })?.errors;
  const top = ReviewListResponse.safeParse(json);
  if (!top.success) {
    const detail = errors?.[0]?.message ?? top.error.issues[0]?.message;
    throw new LayoutChangedError(`ReviewList response has an unexpected shape (${detail})`);
  }
  const list = top.data.data.reviewListFrontend;

  const reviews: StoredReview[] = [];
  const raw = new Map<string, unknown>();
  const rejectReasons: string[] = [];
  for (const card of list.reviewCard) {
    const parsed = ReviewCard.safeParse(card);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      rejectReasons.push(`${issue?.path.join(".")}: ${issue?.message}`);
      continue;
    }
    const c = parsed.data;
    const g = c.guestDetails;
    const b = c.bookingDetails;
    reviews.push({
      propertyId,
      reviewId: c.reviewUrl,
      score: c.reviewScore,
      title: clean(c.textDetails?.title),
      liked: clean(c.textDetails?.positiveText),
      disliked: clean(c.textDetails?.negativeText),
      reviewedAt: new Date(c.reviewedDate * 1000).toISOString(),
      checkIn: b?.checkinDate ?? null,
      checkOut: b?.checkoutDate ?? null,
      nights: b?.numNights ?? null,
      roomName: clean(b?.roomType?.name),
      travellerType: clean(g?.guestTypeTranslation),
      guestName: g?.anonymous ? "Anonymous" : clean(g?.username),
      guestCountry: clean(g?.countryName),
      guestCountryCode: g?.countryCode ?? null,
      language: c.textDetails?.lang ?? null,
      hotelReply: clean(c.partnerReply?.reply),
      helpfulVotes: c.helpfulVotesCount ?? 0,
    });
    raw.set(c.reviewUrl, card);
  }

  const subscores: Subscore[] = [];
  for (const s of list.ratingScores ?? []) {
    const p = RatingScore.safeParse(s);
    if (p.success) subscores.push({ key: p.data.name, label: p.data.translation ?? p.data.name, value: p.data.value });
  }

  return {
    totalReviews: list.reviewsCount,
    reviews,
    raw,
    subscores,
    rejected: list.reviewCard.length - reviews.length,
    rejectReasons,
  };
}
