import type { PropertyId } from "./properties";
import type { TopicId } from "./topics";

export type Sentiment = "positive" | "neutral" | "negative";

/** A review as stored by the collector (one row in the `reviews` table). */
export interface StoredReview {
  propertyId: PropertyId;
  /** Booking.com's own review identifier (`reviewUrl` in their API). Stable across scrapes. */
  reviewId: string;
  score: number;
  title: string | null;
  liked: string | null;
  disliked: string | null;
  /** ISO timestamp of when the guest submitted the review. */
  reviewedAt: string;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  roomName: string | null;
  travellerType: string | null;
  guestName: string | null;
  guestCountry: string | null;
  guestCountryCode: string | null;
  language: string | null;
  hotelReply: string | null;
  helpfulVotes: number;
}

/** A review as shipped to the dashboard, with derived fields added at export time. */
export interface Review extends StoredReview {
  sentiment: Sentiment;
  /** Topics mentioned in the "disliked" part of the review (or the title of a negative review). */
  issues: TopicId[];
  /** Topics mentioned in the "liked" part of the review. */
  praise: TopicId[];
}

export interface Subscore {
  key: string;
  label: string;
  value: number;
}

export interface PropertySnapshot {
  id: PropertyId;
  name: string;
  shortName: string;
  area: string;
  accent: string;
  url: string;
  bookingScore: number | null;
  bookingReviewCount: number | null;
  subscores: Subscore[];
  lastScrapedAt: string | null;
}

export interface RunSummary {
  propertyId: string;
  startedAt: string;
  finishedAt: string | null;
  status: "ok" | "failed" | "partial";
  mode: string;
  pages: number;
  inserted: number;
  updated: number;
  rejected: number;
  error: string | null;
}

export interface Snapshot {
  generatedAt: string;
  timezone: string;
  properties: PropertySnapshot[];
  reviews: Review[];
  runs: RunSummary[];
}
