const ts = () => new Date().toTimeString().slice(0, 8);

export const log = {
  info: (msg: string) => console.log(`${ts()}  ${msg}`),
  warn: (msg: string) => console.warn(`${ts()}  WARN  ${msg}`),
  error: (msg: string) => console.error(`${ts()}  ERROR ${msg}`),
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Random delay between requests so we don't hammer Booking.com. */
export const politePause = (minMs = 1200, maxMs = 2600) =>
  sleep(minMs + Math.random() * (maxMs - minMs));

export async function withRetry<T>(
  label: string,
  fn: (attempt: number) => Promise<T>,
  opts: { attempts?: number; baseMs?: number; retryIf: (err: unknown) => boolean; onRetry?: (err: unknown) => Promise<void> },
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseMs = opts.baseMs ?? 2000;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= attempts || !opts.retryIf(err)) throw err;
      const wait = baseMs * 2 ** (attempt - 1) + Math.random() * 1000;
      log.warn(`${label}: ${(err as Error).message} — retry ${attempt}/${attempts - 1} in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
      await opts.onRetry?.(err);
    }
  }
}
