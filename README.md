# Azzurro Review Insights

Ops dashboard for Booking.com guest reviews across four Sydney properties:

| Property | Booking.com page |
| --- | --- |
| Olympic Hotel Paddington | [olympic-paddington](https://www.booking.com/hotel/au/olympic-paddington.html) |
| Azzurro Pod Hotel Potts Point | [venus-potts-point-sydney](https://www.booking.com/hotel/au/venus-potts-point-sydney.html) |
| Azzurro Pod Hotel Central Sydney | [venus-surry-hills](https://www.booking.com/hotel/au/venus-surry-hills.html) |
| Azzurro Pod Hotel Darling Harbour | [chateau-de-venus](https://www.booking.com/hotel/au/chateau-de-venus.html) |

The app shows this-week vs last-week ratings, per-property breakdowns, topic trends (cleanliness, check-in, staff, noise, facilities, location, room, value), and a searchable review feed.

## Quick start

```bash
# Node 22.13+ recommended (uses built-in node:sqlite)
npm install
npx playwright install chromium   # first time only, for the collector

npm run dev                       # dashboard at http://localhost:3000
```

A committed snapshot lives at `public/data/reviews.json`, so the dashboard works without scraping. Sample CSV is in `data/sample/reviews.csv`.

## Collecting reviews

```bash
npm run scrape                    # all four properties, incremental
npm run scrape -- -p potts-point  # one property
npm run scrape:full               # re-fetch everything
npm run export                    # rebuild JSON + CSV from the local DB
```

Useful flags:

| Flag | Meaning |
| --- | --- |
| `-p <id>` | Property id (`olympic-paddington`, `potts-point`, `central-sydney`, `darling-harbour`). Repeatable. |
| `--full` | Ignore “already have this id” short-circuit; refresh everything. |
| `--since YYYY-MM-DD` | Stop once reviews are older than this date. |
| `--max-pages N` | Cap pages per property (25 reviews per page). |
| `--headed` | Show the browser window. |
| `--db path` | SQLite path (default `data/reviews.db`). |
| `--no-export` | Skip writing the dashboard snapshot. |

First run for a property is a full backfill. Later runs are incremental: newest-first until a page of already-known review ids.

## Architecture

```
scraper/                  Playwright collector + Zod parser + SQLite store
  booking.ts              Opens the property page, captures Booking's ReviewList request, paginates
  parse.ts                Validates GraphQL cards → stored reviews
  db.ts                   SQLite (node:sqlite): properties, reviews, scrape_runs
  scrape.ts               CLI: retries, backoff, incremental stop, export
  export.ts               Enrich (sentiment + topics) → public/data/reviews.json + CSV

src/lib/                  Shared types, topic taxonomy, week math, insight sentences
src/components/           Ops dashboard (KPIs, filters, charts, feed, methodology drawer)
public/data/reviews.json  Snapshot the UI loads (no backend required at runtime)

.github/workflows/
  ci.yml                  typecheck, lint, test, build
  collect-reviews.yml     daily scrape → commit refreshed snapshot
```

The dashboard is a Next.js App Router client UI that fetches the static JSON. No API keys, no server database in production.

## How reviews are collected

Booking.com no longer serves the old `/reviewlist.*.html` HTML list to simple HTTP clients (404 / bot challenge). The live property page loads reviews through an internal GraphQL operation named `ReviewList` (persisted query), with `skip` / `limit` paging and `NEWEST_FIRST` sorting.

The collector:

1. Opens the public property page in Chromium (Playwright) so Booking’s JS challenge and cookies are handled normally.
2. Clicks “Read all reviews” and captures the exact `ReviewList` request the page makes (URL, body, CSRF/client headers, persisted-query hash).
3. Replays that request from inside the page with `sorter: NEWEST_FIRST` and increasing `skip`, 25 reviews at a time.
4. Validates each card with Zod. Malformed cards are counted and skipped; if a whole page fails shape checks, the run fails as a layout change (needs a code fix, not a blind retry).
5. Upserts into SQLite on Booking’s review id (`reviewUrl`). Duplicates are never stored twice; hotel replies and edited text are refreshed on later runs.
6. Exports an enriched JSON snapshot for the dashboard.

Retries use exponential backoff for timeouts, 5xx, and temporary blocks. A bot challenge triggers a page reload and a fresh request template. Failures for one property do not wipe earlier pages already saved.

### Reliability and limits

- **Terms of use.** Booking.com’s terms restrict automated access. This collector is meant for an internal ops view of your own properties’ public reviews. For ongoing production use, prefer the Booking.com extranet export or a partner review API (e.g. ReviewPro, TrustYou, Revinate).
- **Bot challenges.** Datacenter IPs (including GitHub Actions) may get challenged more often than a residential connection. The headed browser path usually clears the first challenge; if a run fails with `BlockedError`, re-run locally or from a less blocked network.
- **Page / API changes.** If Booking renames fields or rotates the persisted-query hash, the Zod parser or request capture fails loudly (`LayoutChangedError`) instead of writing bad data.
- **History window.** Booking typically exposes roughly the last few years of reviews. Guests can edit or remove reviews between runs.
- **Rate.** The scraper waits ~1–3 seconds between pages. A full backfill of ~9k reviews across four hotels takes on the order of 15–25 minutes.

## Topics and sentiment

**Sentiment** comes from the guest’s own Booking score: 8–10 positive, 6–7 mixed, below 6 negative. That is language-agnostic and easy to explain to ops.

**Topics** are keyword lists with word boundaries, applied separately to Booking’s “liked” and “didn’t like” boxes:

| Topic | What it covers |
| --- | --- |
| Cleanliness | Dirt, smells, pests, housekeeping |
| Check-in & access | Arrival, keys, codes, instructions |
| Staff & reception | Service, attitude, front desk |
| Noise | Thin walls, street noise, parties |
| Facilities | Bathroom, Wi‑Fi, air‑con, lift, amenities |
| Location | Neighbourhood, transport, safety |
| Room condition | Size, bed, linen, maintenance |
| Value | Price, fees, “worth it” |

A review counts toward a **complaint** topic when the dislike box matches (or, if empty on a negative review, the headline). **Praise** topics come from the like box. One review can hit several topics, so shares do not add to 100%. Non-English text is still scored, but topic keywords will usually miss it. Negation/sarcasm is a known limit of keyword matching; using the like/dislike split removes most of the noise.

Weeks are Monday–Sunday in `Australia/Sydney`. “This week” is Mon → today, compared with the whole of last week. Periods with fewer than 5 reviews show a small-sample warning.

## Dashboard features

- Property + date filters (this week / last week / 30d / 90d / 12m / all / custom); shareable via URL query
- KPI cards: average vs previous period, volume, % negative, top complaint
- Plain-English “what guests are saying” insights
- Per-property cards with Booking category scores and a 12-week sparkline
- Sentiment and topic trend charts
- Review feed with search, sentiment/topic filters, keyword highlighting, hotel replies

Open **Method & limits** in the header for the same explanation inside the app.

## Deploy

The UI is a standard Next.js app that only needs the committed JSON at build/runtime.

### Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new) — framework preset: Next.js. No env vars required.
3. After deploy, the site serves `public/data/reviews.json` with the app.

Optional: enable `.github/workflows/collect-reviews.yml` so a daily Action refreshes the snapshot and pushes (which triggers a redeploy). Expect occasional blocks on Actions IPs; a local `npm run scrape` + commit is the reliable fallback.

### Local production check

```bash
npm run build
npm start
```

## Scripts and checks

```bash
npm test          # parser, topics, analytics, store
npm run typecheck
npm run lint
npm run build
```

## Project layout (high level)

```
src/app/              Next.js layout + page
src/components/       Dashboard UI
src/lib/              properties, topics, analytics, dates
scraper/              collector
data/reviews.db       local SQLite (gitignored)
data/sample/          committed CSV sample
public/data/          committed JSON snapshot
tests/                vitest + GraphQL fixture
```
