/** Booking served a bot challenge / block page we could not get past. Retry later or from another network. */
export class BlockedError extends Error {
  name = "BlockedError";
}

/** The page or API no longer looks the way the collector expects. Needs a code change, not a retry. */
export class LayoutChangedError extends Error {
  name = "LayoutChangedError";
}

/** Network blips, 5xx, timeouts. Safe to retry. */
export class TransientError extends Error {
  name = "TransientError";
}

export function isRetryable(err: unknown): boolean {
  return err instanceof TransientError || err instanceof BlockedError;
}
