import { describe, expect, it } from "vitest";
import { ReviewStore } from "../scraper/db";
import type { StoredReview } from "../src/lib/types";

const r = (id: string, patch: Partial<StoredReview> = {}): StoredReview => ({
  propertyId: "darling-harbour",
  reviewId: id,
  score: 7,
  title: "Fine",
  liked: "Location",
  disliked: null,
  reviewedAt: "2026-11-20T00:00:00.000Z",
  checkIn: null,
  checkOut: null,
  nights: 2,
  roomName: null,
  travellerType: "Solo traveller",
  guestName: "Kim",
  guestCountry: "Australia",
  guestCountryCode: "au",
  language: "en",
  hotelReply: null,
  helpfulVotes: 0,
  ...patch,
});

describe("ReviewStore", () => {
  it("deduplicates on Booking's review id and refreshes changed fields", () => {
    const store = new ReviewStore(":memory:");
    store.upsertProperty({ id: "darling-harbour", name: "Darling Harbour", url: "x" });

    expect(store.saveReviews([r("a"), r("b")])).toEqual({ inserted: 2, updated: 0 });
    expect(store.saveReviews([r("b", { hotelReply: "Thanks!" }), r("c")])).toEqual({ inserted: 1, updated: 1 });

    expect(store.countReviews()).toBe(3);
    expect(store.allReviews().find((x) => x.reviewId === "b")?.hotelReply).toBe("Thanks!");
    expect(store.knownReviewIds("darling-harbour")).toEqual(new Set(["a", "b", "c"]));
    store.close();
  });

  it("records scrape runs", () => {
    const store = new ReviewStore(":memory:");
    const id = store.startRun("potts-point", "incremental");
    store.finishRun(id, { status: "failed", pages: 1, inserted: 0, updated: 0, rejected: 0, error: "BlockedError: challenge" });
    expect(store.recentRuns()[0]).toMatchObject({ status: "failed", error: "BlockedError: challenge" });
    store.close();
  });
});
