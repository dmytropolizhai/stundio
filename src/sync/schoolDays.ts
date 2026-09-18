/**
 * School-calendar helpers. Deliberately naive: RVT publishes Mon–Fri timetables, and the
 * app has no holiday calendar (there is no endpoint for one). A holiday simply shows an
 * empty day, which is honest — better than pretending to know term dates.
 */
import type { ISODate } from "@/lib/edupage";

const MS_PER_DAY = 86_400_000;

const toUtc = (date: ISODate): number => {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return Number.NaN;
  return Date.UTC(y, m - 1, d);
};

const fromUtc = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: ISODate, days: number): ISODate => {
  const ms = toUtc(date);
  return Number.isNaN(ms) ? date : fromUtc(ms + days * MS_PER_DAY);
};

export const isWeekend = (date: ISODate): boolean => {
  const ms = toUtc(date);
  if (Number.isNaN(ms)) return false;
  const day = new Date(ms).getUTCDay();
  return day === 0 || day === 6;
};

/** The next Mon–Fri strictly after `date`. Friday → Monday. */
export const nextSchoolDay = (date: ISODate): ISODate => {
  let next = addDays(date, 1);
  for (let guard = 0; guard < 7 && isWeekend(next); guard += 1) next = addDays(next, 1);
  return next;
};

/**
 * The days worth fetching substitutions for: today (or Monday, on a weekend) and the next
 * school day. These are the only intraday-volatile data (MODEL.md §6).
 */
export const daysToRefresh = (today: ISODate): ISODate[] => {
  const first = isWeekend(today) ? nextSchoolDay(today) : today;
  return [...new Set([first, nextSchoolDay(first)])];
};
