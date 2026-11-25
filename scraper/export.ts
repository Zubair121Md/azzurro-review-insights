import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { bookingUrl, PROPERTIES, PROPERTY_BY_ID, type PropertyId } from "../src/lib/properties";
import { sentimentForScore } from "../src/lib/sentiment";
import { classifyReview } from "../src/lib/topics";
import type { PropertySnapshot, Review, Snapshot, StoredReview, Subscore } from "../src/lib/types";
import type { ReviewStore } from "./db";

export const SNAPSHOT_PATH = "public/data/reviews.json";
export const CSV_PATH = "data/sample/reviews.csv";

export function enrich(r: StoredReview): Review {
  return { ...r, sentiment: sentimentForScore(r.score), ...classifyReview(r) };
}

export function buildSnapshot(store: ReviewStore): Snapshot {
  const rows = new Map(store.allProperties().map((r) => [String(r.id), r]));
  const properties: PropertySnapshot[] = PROPERTIES.map((p) => {
    const row = rows.get(p.id);
    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      area: p.area,
      accent: p.accent,
      url: bookingUrl(p),
      bookingScore: row?.booking_score == null ? null : Number(row.booking_score),
      bookingReviewCount: row?.booking_review_count == null ? null : Number(row.booking_review_count),
      subscores: row?.subscores_json ? (JSON.parse(String(row.subscores_json)) as Subscore[]) : [],
      lastScrapedAt: (row?.last_scraped_at as string | null) ?? null,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    timezone: "Australia/Sydney",
    properties,
    reviews: store.allReviews().map(enrich),
    runs: store.recentRuns(20),
  };
}

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(reviews: Review[]): string {
  const cols: (keyof Review)[] = [
    "propertyId", "reviewId", "reviewedAt", "score", "sentiment", "title", "liked", "disliked", "issues", "praise",
    "checkIn", "checkOut", "nights", "roomName", "travellerType", "guestName", "guestCountry", "language",
    "hotelReply", "helpfulVotes",
  ];
  const lines = [cols.join(",")];
  for (const r of reviews) lines.push(cols.map((c) => csvCell(r[c])).join(","));
  return lines.join("\n") + "\n";
}

export function exportSnapshot(store: ReviewStore) {
  const snapshot = buildSnapshot(store);
  for (const path of [SNAPSHOT_PATH, CSV_PATH]) mkdirSync(dirname(path), { recursive: true });
  // Null fields are dropped to keep the file the dashboard downloads small.
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, (_k, v) => (v === null ? undefined : v)));
  writeFileSync(CSV_PATH, toCsv(snapshot.reviews));
  return { reviews: snapshot.reviews.length, paths: [SNAPSHOT_PATH, CSV_PATH] };
}

/**
 * When the collector runs somewhere without the SQLite file (a fresh clone, or
 * the scheduled GitHub Action), load the committed snapshot first so the run
 * stays incremental instead of re-downloading every review.
 */
export function seedFromSnapshot(store: ReviewStore, path = SNAPSHOT_PATH): number {
  if (!existsSync(path)) return 0;
  const snap = JSON.parse(readFileSync(path, "utf8")) as Snapshot;
  for (const p of snap.properties) {
    if (!PROPERTY_BY_ID[p.id as PropertyId]) continue;
    store.upsertProperty({
      id: p.id,
      name: p.name,
      url: p.url,
      score: p.bookingScore ?? null,
      reviewCount: p.bookingReviewCount ?? null,
      subscores: p.subscores ?? [],
      scrapedAt: p.lastScrapedAt ?? undefined,
    });
  }
  const stored: StoredReview[] = snap.reviews
    .filter((r) => PROPERTY_BY_ID[r.propertyId])
    .map((r) => ({
      propertyId: r.propertyId,
      reviewId: r.reviewId,
      score: r.score,
      title: r.title ?? null,
      liked: r.liked ?? null,
      disliked: r.disliked ?? null,
      reviewedAt: r.reviewedAt,
      checkIn: r.checkIn ?? null,
      checkOut: r.checkOut ?? null,
      nights: r.nights ?? null,
      roomName: r.roomName ?? null,
      travellerType: r.travellerType ?? null,
      guestName: r.guestName ?? null,
      guestCountry: r.guestCountry ?? null,
      guestCountryCode: r.guestCountryCode ?? null,
      language: r.language ?? null,
      hotelReply: r.hotelReply ?? null,
      helpfulVotes: r.helpfulVotes ?? 0,
    }));
  store.saveReviews(stored);
  return stored.length;
}
