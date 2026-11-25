import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LayoutChangedError } from "../scraper/errors";
import { decodeEntities, parseReviewListResponse } from "../scraper/parse";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/review-list.json", import.meta.url), "utf8"));

describe("parseReviewListResponse", () => {
  it("maps Booking review cards to stored reviews", () => {
    const page = parseReviewListResponse(fixture, "olympic-paddington");
    expect(page.totalReviews).toBe(129);
    expect(page.reviews).toHaveLength(4);

    const first = page.reviews[0];
    expect(first).toMatchObject({
      propertyId: "olympic-paddington",
      reviewId: "d8a6245d924d80b7",
      score: 5,
      liked: "Great location",
      disliked: "Aircon very loud. Difficulty accessing building.",
      guestName: "Alex",
      guestCountry: "Australia",
      checkIn: "2026-11-21",
      checkOut: "2026-11-22",
      nights: 1,
      roomName: "Superior Double Room (Ensuite)",
      travellerType: "Couple",
      language: "en",
    });
    expect(first.reviewedAt).toBe(new Date(1795579678 * 1000).toISOString());
  });

  it("skips malformed cards instead of failing the whole page", () => {
    const page = parseReviewListResponse(fixture, "olympic-paddington");
    expect(page.rejected).toBe(1);
    expect(page.rejectReasons[0]).toContain("reviewScore");
    expect(page.raw.has("broken000000")).toBe(false);
  });

  it("collects Booking's category scores", () => {
    const page = parseReviewListResponse(fixture, "olympic-paddington");
    const clean = page.subscores.find((s) => s.key === "hotel_clean");
    expect(clean?.label).toBe("Cleanliness");
    expect(clean?.value).toBeGreaterThan(0);
  });

  it("throws a layout error when the response shape changes", () => {
    expect(() => parseReviewListResponse({ data: { somethingElse: {} } }, "potts-point")).toThrow(LayoutChangedError);
    expect(() =>
      parseReviewListResponse({ errors: [{ message: "PersistedQueryNotFound" }] }, "potts-point"),
    ).toThrow(/PersistedQueryNotFound/);
  });

  it("decodes HTML entities in review text", () => {
    expect(decodeEntities("We&#39;re sorry &amp; we&#x27;ll fix it &quot;soon&quot;")).toBe(`We're sorry & we'll fix it "soon"`);
  });
});
