/**
 * Calendar-date helpers.
 *
 * A LocalDate is a "YYYY-MM-DD" string in the user's own timezone. It is the
 * only unit streak logic works with. All arithmetic happens on the calendar
 * date via UTC, so DST transitions (23h / 25h days) can never shift a day.
 */
export type LocalDate = string;

const DAY_MS = 86_400_000;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** The calendar date of an instant, as seen in the device's current timezone. */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): LocalDate {
  return toLocalDate(new Date());
}

function toUtcMs(d: LocalDate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(d: LocalDate, n: number): LocalDate {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(d: LocalDate): number {
  return new Date(toUtcMs(d)).getUTCDay();
}

/** First day of the week containing d. weekStartsOn: 0 = Sunday, 1 = Monday. */
export function startOfWeek(d: LocalDate, weekStartsOn: 0 | 1 = 1): LocalDate {
  const offset = (dayOfWeek(d) - weekStartsOn + 7) % 7;
  return addDays(d, -offset);
}

export function startOfMonth(d: LocalDate): LocalDate {
  return `${d.slice(0, 7)}-01`;
}

export function daysInMonth(d: LocalDate): number {
  const [y, m] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(d: LocalDate, n: number): LocalDate {
  const [y, m] = d.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUtcMs(date.getTime());
}

/** Inclusive range of dates from a to b. Empty when a > b. */
export function dateRange(a: LocalDate, b: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const n = diffDays(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A JS Date at local noon for formatting with Intl. Noon avoids DST edge hours. */
export function toDisplayDate(d: LocalDate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, 12);
}
