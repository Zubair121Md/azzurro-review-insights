"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { dataQuality, LOW_SAMPLE } from "@/lib/analytics";
import { formatDateTime } from "@/lib/dates";
import { PROPERTY_BY_ID, type PropertyId } from "@/lib/properties";
import { TOPICS } from "@/lib/topics";
import type { Snapshot } from "@/lib/types";

export function Methodology({ open, onClose, snapshot }: { open: boolean; onClose: () => void; snapshot: Snapshot | null }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const quality = useMemo(() => (snapshot ? dataQuality(snapshot.reviews, snapshot.properties) : null), [snapshot]);
  const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)}%`);
  const latestRuns = snapshot?.runs.filter((r, i, all) => all.findIndex((x) => x.propertyId === r.propertyId) === i) ?? [];

  return (
    <div className={clsx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={clsx("absolute inset-0 bg-ink-950/40 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        role="dialog"
        aria-label="How the numbers are calculated"
        className={clsx(
          "absolute top-0 right-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">How the numbers are calculated</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-600">
          <Block title="Where the data comes from">
            Reviews are collected from the public Booking.com page of each property: score, headline, what the guest liked and
            didn&apos;t like, stay dates, room, traveller type, country and any reply from the hotel. Each review has a Booking.com
            ID, so a review is only ever stored once — later runs just refresh it (for example when the hotel replies).
          </Block>

          <Block title="Weeks and dates">
            Weeks run Monday to Sunday in Sydney time, and reviews are dated by when the guest submitted them (not their stay
            dates). &ldquo;This week&rdquo; is the week so far and is compared with the whole of last week.
          </Block>

          <Block title="Positive, mixed and negative">
            Based on the guest&apos;s own score: <b className="text-emerald-700">8–10 positive</b>,{" "}
            <b className="text-amber-700">6–7 mixed</b>, <b className="text-rose-700">below 6 negative</b>. We use the score rather
            than guessing from the wording because it is the guest&apos;s own verdict and works for every language.
          </Block>

          <Block title="Topics">
            <p>
              Booking.com asks guests what they liked and what they didn&apos;t like in two separate boxes. A review counts as a{" "}
              <b>complaint</b> about a topic when the &ldquo;didn&apos;t like&rdquo; box contains one of the topic&apos;s keywords,
              and as <b>praise</b> when the &ldquo;liked&rdquo; box does. If a negative review leaves the &ldquo;didn&apos;t
              like&rdquo; box empty, its headline is used instead. One review can mention several topics.
            </p>
            <p className="mt-2">
              Keywords exist in English plus French, Spanish, German and Italian, which together cover most reviews. Reviews in
              other languages (mainly Chinese, Japanese and Korean) still count toward scores, but usually not toward topics.
            </p>
            <p className="mt-2">
              &ldquo;40% of negative reviews mentioned cleanliness&rdquo; means: of all reviews scored below 6 in the period, 40% had
              a cleanliness keyword in what the guest didn&apos;t like.
            </p>
            <details className="mt-3 rounded-xl bg-slate-50 p-3">
              <summary className="cursor-pointer font-medium text-slate-700">Keyword lists</summary>
              <dl className="mt-3 space-y-2.5">
                {TOPICS.map((t) => (
                  <div key={t.id}>
                    <dt className="font-medium text-slate-800">{t.label}</dt>
                    <dd className="font-mono text-xs text-slate-500">
                      {t.patterns.map((p) => p.replace(/\\w\*/g, "…").replace(/\\/g, "").replace(/\?/g, "")).join(", ")}
                      <span className="text-slate-400"> + {t.translations.length} French/Spanish/German/Italian terms</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </Block>

          <Block title="Limits to keep in mind">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Each property gets only a handful of reviews a week. With fewer than {LOW_SAMPLE} reviews, one guest can move a
                percentage by 20 points or more — the dashboard flags these periods.
              </li>
              <li>
                Keyword matching does not understand negation or sarcasm (&ldquo;not noisy at all&rdquo; in the dislikes box still
                counts as noise). Using the liked/disliked split removes most of this, but not all.
              </li>
              <li>
                Reviews in languages other than English, French, Spanish, German and Italian are scored and counted, but their
                topics will usually be missed.
              </li>
              <li>
                Praise written in the dislikes box (&ldquo;nothing, staff were lovely&rdquo;) can still be counted as a complaint.
                Common &ldquo;nothing / none&rdquo; answers are filtered out.
              </li>
              <li>
                Booking.com only shows roughly the last three years of reviews, and guests can edit or remove reviews, so history
                may change slightly between runs.
              </li>
              <li>The data is as fresh as the last collection run (shown in the header), not live.</li>
            </ul>
          </Block>

          {quality && (
            <Block title="Data quality">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-1 font-medium">Property</th>
                    <th className="py-1 text-right font-medium">Collected</th>
                    <th className="py-1 text-right font-medium">On Booking.com</th>
                    <th className="py-1 text-right font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quality.coverage.map((c) => (
                    <tr key={c.propertyId}>
                      <td className="py-1.5 text-slate-700">{PROPERTY_BY_ID[c.propertyId]?.shortName}</td>
                      <td className="tabular py-1.5 text-right">{c.stored.toLocaleString("en-AU")}</td>
                      <td className="tabular py-1.5 text-right">{c.listed?.toLocaleString("en-AU") ?? "–"}</td>
                      <td className="tabular py-1.5 text-right font-medium text-slate-800">
                        {c.listed ? pct(Math.min(1, c.stored / c.listed)) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
                <li>{pct(quality.englishShare)} of reviews are written in English.</li>
                <li>
                  Negative reviews with a written complaint that matched at least one topic: {pct(quality.topicCoverage.english)} in
                  English ({quality.topicCoverage.englishCount.toLocaleString("en-AU")}), {pct(quality.topicCoverage.other)} in
                  other languages ({quality.topicCoverage.otherCount.toLocaleString("en-AU")}).
                </li>
                <li>{quality.withoutText.toLocaleString("en-AU")} reviews have a score but no written comments.</li>
              </ul>
            </Block>
          )}

          {latestRuns.length > 0 && (
            <Block title="Last collection run">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-1 font-medium">Property</th>
                    <th className="py-1 font-medium">Finished</th>
                    <th className="py-1 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestRuns.map((r) => (
                    <tr key={r.propertyId}>
                      <td className="py-1.5 text-slate-700">{PROPERTY_BY_ID[r.propertyId as PropertyId]?.shortName ?? r.propertyId}</td>
                      <td className="py-1.5">{r.finishedAt ? formatDateTime(r.finishedAt) : "–"}</td>
                      <td className="py-1.5">
                        {r.status === "ok" ? (
                          <span className="text-emerald-700">OK · {r.inserted} new</span>
                        ) : (
                          <span className="text-rose-700" title={r.error ?? undefined}>
                            {r.status} {r.error ? `— ${r.error.slice(0, 60)}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
          )}
        </div>
      </aside>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-900 uppercase">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
