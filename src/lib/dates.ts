export const TIMEZONE = "Australia/Sydney";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day (YYYY-MM-DD) in Sydney for an instant. */
export function sydneyDay(input: string | number | Date): string {
  return dayFmt.format(new Date(input));
}

const toUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = toUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** Monday of the week containing `day`. Weeks run Monday–Sunday. */
export function weekStart(day: string): string {
  const dow = toUtc(day).getUTCDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(day: string, n: number): string {
  const d = toUtc(monthStart(day));
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUtc(d);
}

const shortFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit", timeZone: "UTC" });

export const formatDay = (day: string, withYear = false) => (withYear ? longFmt : shortFmt).format(toUtc(day));
export const formatMonth = (day: string) => monthFmt.format(toUtc(day));

export function formatRange(from: string, to: string): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatDay(from, !sameYear)} – ${formatDay(to, true)}`;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function relativeTime(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
