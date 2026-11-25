import type { Sentiment } from "./types";

/**
 * Booking.com scores are 1–10. We bucket on the guest's own score rather than
 * running NLP over the text: it is the guest's explicit verdict, it works for
 * every language, and it is easy to explain to the team.
 */
export const SENTIMENT_THRESHOLDS = { positiveFrom: 8, negativeBelow: 6 } as const;

export function sentimentForScore(score: number): Sentiment {
  if (score >= SENTIMENT_THRESHOLDS.positiveFrom) return "positive";
  if (score < SENTIMENT_THRESHOLDS.negativeBelow) return "negative";
  return "neutral";
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Mixed",
  negative: "Negative",
};
