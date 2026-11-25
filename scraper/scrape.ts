import { parseArgs } from "node:util";
import { bookingUrl, PROPERTIES, type PropertyConfig } from "../src/lib/properties";
import { BookingSession, type PropertyPage } from "./booking";
import { DEFAULT_DB_PATH, ReviewStore } from "./db";
import { BlockedError, isRetryable, LayoutChangedError } from "./errors";
import { exportSnapshot, seedFromSnapshot } from "./export";
import { log, politePause, withRetry } from "./log";
import { parseReviewListResponse } from "./parse";

const PAGE_SIZE = 25;

const { values: args } = parseArgs({
  options: {
    property: { type: "string", short: "p", multiple: true },
    full: { type: "boolean", default: false },
    since: { type: "string" },
    "max-pages": { type: "string", default: "500" },
    headed: { type: "boolean", default: false },
    db: { type: "string", default: DEFAULT_DB_PATH },
    "no-export": { type: "boolean", default: false },
  },
});

type Mode = "incremental" | "backfill" | "full";

interface PropertyResult {
  property: PropertyConfig;
  status: "ok" | "partial" | "failed";
  inserted: number;
  updated: number;
  error?: string;
}

async function scrapeProperty(session: BookingSession, store: ReviewStore, property: PropertyConfig): Promise<PropertyResult> {
  const known = store.knownReviewIds(property.id);
  const mode: Mode = args.full ? "full" : known.size === 0 ? "backfill" : "incremental";
  const since = args.since ? new Date(args.since) : null;
  const maxPages = Number(args["max-pages"]);
  const runId = store.startRun(property.id, mode);
  const totals = { pages: 0, inserted: 0, updated: 0, rejected: 0, fetched: 0 };

  log.info(`${property.shortName}: starting ${mode} run (${known.size} reviews already stored)`);

  let page: PropertyPage | null = null;
  try {
    page = await withRetry(`${property.shortName} open`, () => session.openProperty(property), {
      attempts: 3,
      retryIf: isRetryable,
    });

    let skip = 0;
    let status: PropertyResult["status"] = "ok";
    let expectedTotal = Infinity;
    while (skip < expectedTotal) {
      const json = await withRetry(`${property.shortName} page ${totals.pages + 1}`, () => page!.fetchReviews(skip, PAGE_SIZE), {
        retryIf: isRetryable,
        onRetry: async (err) => {
          if (err instanceof BlockedError) await page!.reload();
        },
      });
      const parsed = parseReviewListResponse(json, property.id);
      expectedTotal = parsed.totalReviews;

      if (totals.pages === 0) {
        store.upsertProperty({
          id: property.id,
          name: property.name,
          url: bookingUrl(property),
          score: page.bookingScore,
          reviewCount: parsed.totalReviews,
          subscores: parsed.subscores,
          scrapedAt: new Date().toISOString(),
        });
      }

      const cardsOnPage = parsed.reviews.length + parsed.rejected;
      if (cardsOnPage > 0 && parsed.reviews.length === 0) {
        throw new LayoutChangedError(`every review on the page failed validation (${parsed.rejectReasons[0]})`);
      }
      if (parsed.rejected) log.warn(`${property.shortName}: skipped ${parsed.rejected} malformed review(s): ${parsed.rejectReasons[0]}`);

      const newOnPage = parsed.reviews.filter((r) => !known.has(r.reviewId)).length;
      const { inserted, updated } = store.saveReviews(parsed.reviews, parsed.raw);
      parsed.reviews.forEach((r) => known.add(r.reviewId));
      totals.pages++;
      totals.inserted += inserted;
      totals.updated += updated;
      totals.rejected += parsed.rejected;
      totals.fetched += cardsOnPage;

      const oldest = parsed.reviews.at(-1)?.reviewedAt;
      log.info(
        `${property.shortName}: page ${totals.pages} — ${cardsOnPage} reviews, ${inserted} new` +
          (oldest ? `, back to ${oldest.slice(0, 10)}` : "") +
          ` (${Math.min(skip + cardsOnPage, expectedTotal)}/${expectedTotal})`,
      );

      if (cardsOnPage < PAGE_SIZE) break;
      if (mode === "incremental" && newOnPage === 0) break; // caught up with what we already have
      if (since && oldest && new Date(oldest) < since) break;
      if (totals.pages >= maxPages) {
        log.warn(`${property.shortName}: stopped at --max-pages=${maxPages}`);
        status = "partial";
        break;
      }
      skip += PAGE_SIZE;
      await politePause();
    }

    if (totals.fetched && totals.rejected / totals.fetched > 0.1) status = "partial";
    store.finishRun(runId, { status, ...totals });
    log.info(`${property.shortName}: done — ${totals.inserted} new, ${totals.updated} refreshed, ${store.countReviews(property.id)} stored`);
    return { property, status, inserted: totals.inserted, updated: totals.updated };
  } catch (err) {
    const message = `${(err as Error).name}: ${(err as Error).message}`;
    log.error(`${property.shortName}: ${message}`);
    // Whatever was saved before the failure is kept — the next run continues from there.
    store.finishRun(runId, { status: "failed", ...totals, error: message });
    return { property, status: "failed", inserted: totals.inserted, updated: totals.updated, error: message };
  } finally {
    await page?.close();
  }
}

async function main() {
  const selected = args.property?.length
    ? PROPERTIES.filter((p) => args.property!.includes(p.id))
    : PROPERTIES;
  if (args.property?.length && selected.length !== args.property.length) {
    const ids = PROPERTIES.map((p) => p.id).join(", ");
    throw new Error(`unknown property in --property. Valid ids: ${ids}`);
  }

  const store = new ReviewStore(args.db);
  if (store.countReviews() === 0) {
    const seeded = seedFromSnapshot(store);
    if (seeded) log.info(`empty database — seeded ${seeded} reviews from the committed snapshot`);
  }

  const session = await BookingSession.start({ headless: !args.headed });
  const results: PropertyResult[] = [];
  try {
    for (const property of selected) {
      results.push(await scrapeProperty(session, store, property));
    }
  } finally {
    await session.close();
  }

  console.log("\nSummary");
  for (const r of results) {
    console.log(
      `  ${r.status.padEnd(8)} ${r.property.shortName.padEnd(16)} +${r.inserted} new, ${r.updated} refreshed` +
        (r.error ? `  — ${r.error}` : ""),
    );
  }

  if (!args["no-export"]) {
    const out = exportSnapshot(store);
    log.info(`exported ${out.reviews} reviews to ${out.paths.join(", ")}`);
  }
  store.close();

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  log.error((err as Error).message);
  process.exitCode = 1;
});
