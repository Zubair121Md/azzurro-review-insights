import { describe, expect, it } from "vitest";
import { sentimentForScore } from "../src/lib/sentiment";
import { classifyReview, detectTopics, highlightTopics, isTrivial } from "../src/lib/topics";

describe("detectTopics", () => {
  it.each([
    ["The bathroom was filthy and smelled of mould", ["cleanliness", "facilities"]],
    ["Check-in was outsourced overseas and the door code didn't work", ["check-in"]],
    ["Receptionist was rude", ["staff"]],
    ["Thin walls, could hear everything all night", ["noise"]],
    ["The aircon and wifi didn't work", ["facilities"]],
    ["Great location, 5 min walk to Kings Cross station", ["location"]],
    ["Room was tiny and the mattress was worn out", ["room"]],
    ["Way overpriced for what you get", ["value"]],
  ])("%s", (text, expected) => {
    expect(detectTopics(text)).toEqual(expected);
  });

  it("matches whole words only", () => {
    expect(detectTopics("Lovely heart-warming welcome")).not.toContain("noise"); // "heart" ≠ "hear"
    expect(detectTopics("The pricing page")).toContain("value");
    expect(detectTopics("bedroom")).toEqual([]); // "bed" only as a whole word
  });

  it("ignores 'nothing' style answers", () => {
    expect(isTrivial("Nothing")).toBe(true);
    expect(isTrivial("n/a")).toBe(true);
    expect(isTrivial("Nothing really.")).toBe(true);
    expect(detectTopics("Nothing at all")).toEqual([]);
    expect(isTrivial("Nothing worked in the room")).toBe(false);
  });
});

describe("classifyReview", () => {
  it("uses the disliked box for issues and the liked box for praise", () => {
    const r = classifyReview({ score: 5, title: "Good location, but loud", liked: "Location and staff", disliked: "Bathroom wasn't cleaned" });
    expect(r.praise).toEqual(["staff", "location"]);
    expect(r.issues).toEqual(["cleanliness", "facilities"]);
  });

  it("falls back to a negative review's headline when the disliked box is empty", () => {
    expect(classifyReview({ score: 3, title: "Filthy room", liked: null, disliked: "Nothing" }).issues).toEqual(["cleanliness", "room"]);
  });

  it("only treats the headline as a complaint for negative reviews", () => {
    const r = classifyReview({ score: 9, title: "Clean and quiet", liked: null, disliked: null });
    expect(r.issues).toEqual([]);
  });
});

describe("highlightTopics", () => {
  it("splits text around keyword matches", () => {
    const parts = highlightTopics("The room was dirty", ["cleanliness"]);
    expect(parts).toEqual([{ text: "The room was " }, { text: "dirty", topic: "cleanliness" }]);
  });
});

describe("sentimentForScore", () => {
  it("buckets Booking scores", () => {
    expect(sentimentForScore(10)).toBe("positive");
    expect(sentimentForScore(8)).toBe("positive");
    expect(sentimentForScore(7)).toBe("neutral");
    expect(sentimentForScore(6)).toBe("neutral");
    expect(sentimentForScore(5.9)).toBe("negative");
    expect(sentimentForScore(1)).toBe("negative");
  });
});
