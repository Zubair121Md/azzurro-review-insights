import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { bookingUrl, type PropertyConfig } from "../src/lib/properties";
import { BlockedError, LayoutChangedError, TransientError } from "./errors";
import { log } from "./log";

/**
 * Booking.com's property page loads reviews from its own GraphQL endpoint
 * (operation `ReviewList`, a persisted query). Instead of hard-coding the
 * query hash and headers, we open the property page in a real browser, open
 * the reviews panel, and capture the request the page itself makes. We then
 * replay that request from inside the page with different sort/paging values.
 *
 * Benefits: the browser handles Booking's JavaScript bot challenge and
 * cookies, and when Booking redeploys (new hash, new headers) we pick up the
 * new values automatically on the next run.
 */

interface RequestTemplate {
  url: string;
  body: { operationName: string; variables: { input: Record<string, unknown> } & Record<string, unknown> } & Record<string, unknown>;
  headers: Record<string, string>;
}

const FORWARDED_HEADERS = [
  "content-type",
  "x-booking-csrf-token",
  "x-booking-context-action-name",
  "x-booking-context-action",
  "x-booking-context-aid",
  "x-booking-site-type-id",
  "x-booking-topic",
  "x-booking-pageview-id",
  "x-booking-et-serialized-state",
  "x-apollo-operation-name",
  "apollographql-client-name",
  "apollographql-client-version",
];

const READ_ALL_SELECTORS = [
  '[data-testid="review-score-read-all"]',
  '[data-testid="fr-read-all-reviews"]',
  '[data-testid="Property-Header-Nav-Tab-Trigger-reviews"]',
];

export class BookingSession {
  private constructor(
    private browser: Browser,
    private context: BrowserContext,
  ) {}

  static async start(opts: { headless?: boolean } = {}): Promise<BookingSession> {
    const browser = await chromium.launch({ headless: opts.headless ?? true });
    const context = await browser.newContext({
      locale: "en-GB",
      timezoneId: "Australia/Sydney",
      viewport: { width: 1366, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    // Images, fonts and media aren't needed and make every page load slower.
    await context.route(/\.(png|jpe?g|webp|gif|svg|woff2?|mp4)(\?|$)/i, (r) => r.abort());
    return new BookingSession(browser, context);
  }

  async close() {
    await this.context.close().catch(() => {});
    await this.browser.close().catch(() => {});
  }

  async openProperty(property: PropertyConfig): Promise<PropertyPage> {
    const page = await this.context.newPage();
    const pp = new PropertyPage(page, property);
    await pp.load();
    return pp;
  }
}

export class PropertyPage {
  private template: RequestTemplate | null = null;

  constructor(
    private page: Page,
    readonly property: PropertyConfig,
  ) {}

  async close() {
    await this.page.close().catch(() => {});
  }

  /** (Re)loads the property page and captures a fresh ReviewList request template. */
  async load(): Promise<void> {
    const url = bookingUrl(this.property);
    this.template = null;

    let captured: RequestTemplate | null = null;
    const onRequest = (req: import("playwright").Request) => {
      const post = req.postData();
      if (!post || !post.includes('"operationName":"ReviewList"')) return;
      try {
        captured = { url: req.url(), body: JSON.parse(post), headers: req.headers() };
      } catch {
        /* ignore */
      }
    };
    this.page.on("request", onRequest);

    try {
      const res = await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch((e) => {
        throw new TransientError(`could not load ${url}: ${(e as Error).message}`);
      });
      if (res && res.status() >= 500) throw new TransientError(`property page returned HTTP ${res.status()}`);

      // The first response is often a 202 JavaScript challenge which reloads itself
      // into the real page. Wait until the real page is there.
      const ready = await this.page
        .waitForSelector('[data-testid="review-score-component"], #hp_hotel_name, h2.pp-header__title', { timeout: 45_000 })
        .catch(() => null);
      if (!ready) {
        const title = await this.page.title().catch(() => "");
        const html = await this.page.content().catch(() => "");
        if (/challenge|captcha|awswaf/i.test(html) || !title) {
          throw new BlockedError("Booking.com served a bot challenge that did not resolve");
        }
        if (/404|not found/i.test(title)) throw new LayoutChangedError(`property page not found: ${url}`);
        throw new LayoutChangedError(`property page loaded ("${title}") but the review score block is missing`);
      }

      await this.dismissCookieBanner();
      for (const sel of READ_ALL_SELECTORS) {
        if (captured) break;
        const el = this.page.locator(sel).first();
        if (!(await el.count())) continue;
        await el.click({ timeout: 10_000 }).catch(() => {});
        await this.page.waitForRequest((r) => r.postData()?.includes('"operationName":"ReviewList"') ?? false, { timeout: 15_000 }).catch(() => {});
      }
      if (!captured) {
        throw new LayoutChangedError(
          "could not find the reviews request on the property page — the 'Read all reviews' button or ReviewList query may have changed",
        );
      }
      this.template = captured;
    } finally {
      this.page.off("request", onRequest);
    }
  }

  private async dismissCookieBanner() {
    const btn = this.page.locator("#onetrust-reject-all-handler, #onetrust-accept-btn-handler").first();
    if (await btn.count()) await btn.click({ timeout: 3_000 }).catch(() => {});
    const close = this.page.locator('[aria-label="Dismiss sign-in info."]').first();
    if (await close.count()) await close.click({ timeout: 3_000 }).catch(() => {});
  }

  /** Fetches one page of reviews, newest first. Returns the raw JSON. */
  async fetchReviews(skip: number, limit: number): Promise<unknown> {
    if (!this.template) throw new Error("property page not loaded");
    const body = structuredClone(this.template.body);
    body.variables.input = { ...body.variables.input, sorter: "NEWEST_FIRST", skip, limit, filters: { text: "" } };
    const headers: Record<string, string> = {};
    for (const k of FORWARDED_HEADERS) if (this.template.headers[k]) headers[k] = this.template.headers[k];

    const result = await this.page
      .evaluate(
        async ({ url, body, headers }) => {
          const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), credentials: "include" });
          const text = await r.text();
          return { status: r.status, contentType: r.headers.get("content-type") ?? "", text };
        },
        { url: this.template.url, body, headers },
      )
      .catch((e) => {
        throw new TransientError(`request failed inside page: ${(e as Error).message}`);
      });

    if (result.status === 403 || result.status === 429 || result.status === 202) {
      throw new BlockedError(`ReviewList returned HTTP ${result.status}`);
    }
    if (result.status >= 500) throw new TransientError(`ReviewList returned HTTP ${result.status}`);
    if (!result.contentType.includes("json")) {
      if (/challenge|captcha/i.test(result.text)) throw new BlockedError("ReviewList returned a challenge page");
      throw new LayoutChangedError(`ReviewList returned ${result.contentType || "no content type"} (HTTP ${result.status})`);
    }
    const json = JSON.parse(result.text);
    const gqlError = json?.errors?.[0]?.message as string | undefined;
    if (gqlError && !json?.data?.reviewListFrontend) {
      if (/persisted ?query/i.test(gqlError)) throw new LayoutChangedError(`ReviewList query rejected: ${gqlError}`);
      throw new TransientError(`ReviewList error: ${gqlError}`);
    }
    return json;
  }

  /** The headline score Booking shows on the page (it is sent along with the reviews request). */
  get bookingScore(): number | null {
    const s = this.template?.body.variables.input.hotelScore;
    return typeof s === "number" ? s : null;
  }

  async reload() {
    log.info(`${this.property.shortName}: reloading property page to refresh session`);
    await this.load();
  }
}
