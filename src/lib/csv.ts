import type { Review } from "./types";

const COLUMNS: (keyof Review)[] = [
  "propertyId", "reviewId", "reviewedAt", "score", "sentiment", "title", "liked", "disliked", "issues", "praise",
  "checkIn", "checkOut", "nights", "roomName", "travellerType", "guestName", "guestCountry", "language",
  "hotelReply", "helpfulVotes",
];

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function reviewsToCsv(reviews: Review[]): string {
  const lines = [COLUMNS.join(",")];
  for (const r of reviews) lines.push(COLUMNS.map((c) => cell(r[c])).join(","));
  return lines.join("\n") + "\n";
}
