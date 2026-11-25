import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { PropertyId } from "../src/lib/properties";
import type { RunSummary, StoredReview, Subscore } from "../src/lib/types";

export const DEFAULT_DB_PATH = "data/reviews.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS properties (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  booking_url          TEXT NOT NULL,
  booking_score        REAL,
  booking_review_count INTEGER,
  subscores_json       TEXT,
  last_scraped_at      TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  property_id        TEXT NOT NULL REFERENCES properties(id),
  review_id          TEXT NOT NULL,
  score              REAL NOT NULL,
  title              TEXT,
  liked              TEXT,
  disliked           TEXT,
  reviewed_at        TEXT NOT NULL,
  check_in           TEXT,
  check_out          TEXT,
  nights             INTEGER,
  room_name          TEXT,
  traveller_type     TEXT,
  guest_name         TEXT,
  guest_country      TEXT,
  guest_country_code TEXT,
  language           TEXT,
  hotel_reply        TEXT,
  helpful_votes      INTEGER NOT NULL DEFAULT 0,
  raw_json           TEXT,
  first_seen_at      TEXT NOT NULL,
  last_seen_at       TEXT NOT NULL,
  PRIMARY KEY (property_id, review_id)
);
CREATE INDEX IF NOT EXISTS reviews_by_date ON reviews (property_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL,
  mode        TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL DEFAULT 'running',
  pages       INTEGER NOT NULL DEFAULT 0,
  inserted    INTEGER NOT NULL DEFAULT 0,
  updated     INTEGER NOT NULL DEFAULT 0,
  rejected    INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);
`;

type Row = Record<string, string | number | null>;

export class ReviewStore {
  readonly db: DatabaseSync;

  constructor(path = DEFAULT_DB_PATH) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(SCHEMA);
  }

  close() {
    this.db.close();
  }

  upsertProperty(p: {
    id: PropertyId;
    name: string;
    url: string;
    score?: number | null;
    reviewCount?: number | null;
    subscores?: Subscore[];
    scrapedAt?: string;
  }) {
    this.db
      .prepare(
        `INSERT INTO properties (id, name, booking_url, booking_score, booking_review_count, subscores_json, last_scraped_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           booking_url = excluded.booking_url,
           booking_score = COALESCE(excluded.booking_score, booking_score),
           booking_review_count = COALESCE(excluded.booking_review_count, booking_review_count),
           subscores_json = COALESCE(excluded.subscores_json, subscores_json),
           last_scraped_at = COALESCE(excluded.last_scraped_at, last_scraped_at)`,
      )
      .run(
        p.id,
        p.name,
        p.url,
        p.score ?? null,
        p.reviewCount ?? null,
        p.subscores?.length ? JSON.stringify(p.subscores) : null,
        p.scrapedAt ?? null,
      );
  }

  knownReviewIds(propertyId: PropertyId): Set<string> {
    const rows = this.db.prepare("SELECT review_id FROM reviews WHERE property_id = ?").all(propertyId) as Row[];
    return new Set(rows.map((r) => String(r.review_id)));
  }

  countReviews(propertyId?: PropertyId): number {
    const row = propertyId
      ? (this.db.prepare("SELECT COUNT(*) n FROM reviews WHERE property_id = ?").get(propertyId) as Row)
      : (this.db.prepare("SELECT COUNT(*) n FROM reviews").get() as Row);
    return Number(row.n);
  }

  /**
   * Inserts new reviews and refreshes existing ones (guests can edit reviews and
   * hotels can add replies later). Returns how many rows were new vs updated.
   */
  saveReviews(reviews: StoredReview[], raw: Map<string, unknown> = new Map(), seenAt = new Date().toISOString()) {
    const exists = this.db.prepare("SELECT 1 FROM reviews WHERE property_id = ? AND review_id = ?");
    const upsert = this.db.prepare(
      `INSERT INTO reviews (
         property_id, review_id, score, title, liked, disliked, reviewed_at, check_in, check_out, nights,
         room_name, traveller_type, guest_name, guest_country, guest_country_code, language, hotel_reply,
         helpful_votes, raw_json, first_seen_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(property_id, review_id) DO UPDATE SET
         score = excluded.score, title = excluded.title, liked = excluded.liked, disliked = excluded.disliked,
         reviewed_at = excluded.reviewed_at, hotel_reply = excluded.hotel_reply,
         helpful_votes = excluded.helpful_votes, raw_json = COALESCE(excluded.raw_json, raw_json),
         last_seen_at = excluded.last_seen_at`,
    );
    let inserted = 0;
    let updated = 0;
    this.db.exec("BEGIN");
    try {
      for (const r of reviews) {
        if (exists.get(r.propertyId, r.reviewId)) updated++;
        else inserted++;
        const rawJson = raw.has(r.reviewId) ? JSON.stringify(raw.get(r.reviewId)) : null;
        upsert.run(
          r.propertyId, r.reviewId, r.score, r.title, r.liked, r.disliked, r.reviewedAt, r.checkIn, r.checkOut,
          r.nights, r.roomName, r.travellerType, r.guestName, r.guestCountry, r.guestCountryCode, r.language,
          r.hotelReply, r.helpfulVotes, rawJson, seenAt, seenAt,
        );
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return { inserted, updated };
  }

  allReviews(): StoredReview[] {
    const rows = this.db.prepare("SELECT * FROM reviews ORDER BY reviewed_at DESC").all() as Row[];
    return rows.map((r) => ({
      propertyId: r.property_id as PropertyId,
      reviewId: String(r.review_id),
      score: Number(r.score),
      title: r.title as string | null,
      liked: r.liked as string | null,
      disliked: r.disliked as string | null,
      reviewedAt: String(r.reviewed_at),
      checkIn: r.check_in as string | null,
      checkOut: r.check_out as string | null,
      nights: r.nights === null ? null : Number(r.nights),
      roomName: r.room_name as string | null,
      travellerType: r.traveller_type as string | null,
      guestName: r.guest_name as string | null,
      guestCountry: r.guest_country as string | null,
      guestCountryCode: r.guest_country_code as string | null,
      language: r.language as string | null,
      hotelReply: r.hotel_reply as string | null,
      helpfulVotes: Number(r.helpful_votes ?? 0),
    }));
  }

  allProperties() {
    return this.db.prepare("SELECT * FROM properties").all() as Row[];
  }

  startRun(propertyId: string, mode: string): number {
    const res = this.db
      .prepare("INSERT INTO scrape_runs (property_id, mode, started_at) VALUES (?, ?, ?)")
      .run(propertyId, mode, new Date().toISOString());
    return Number(res.lastInsertRowid);
  }

  finishRun(
    id: number,
    r: { status: RunSummary["status"]; pages: number; inserted: number; updated: number; rejected: number; error?: string | null },
  ) {
    this.db
      .prepare(
        `UPDATE scrape_runs SET finished_at = ?, status = ?, pages = ?, inserted = ?, updated = ?, rejected = ?, error = ?
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), r.status, r.pages, r.inserted, r.updated, r.rejected, r.error ?? null, id);
  }

  recentRuns(limit = 20): RunSummary[] {
    const rows = this.db.prepare("SELECT * FROM scrape_runs ORDER BY id DESC LIMIT ?").all(limit) as Row[];
    return rows.map((r) => ({
      propertyId: String(r.property_id),
      startedAt: String(r.started_at),
      finishedAt: r.finished_at as string | null,
      status: r.status as RunSummary["status"],
      mode: String(r.mode),
      pages: Number(r.pages),
      inserted: Number(r.inserted),
      updated: Number(r.updated),
      rejected: Number(r.rejected),
      error: r.error as string | null,
    }));
  }
}
