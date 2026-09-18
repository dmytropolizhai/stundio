/**
 * School-week arithmetic for the week pager. Mon–Fri only: RVT publishes no weekend
 * lessons, and a two-column-wider grid for two always-empty days is a worse screen.
 */
import { weekdayOf, type HHMM, type ISODate, type ResolvedDay, type Weekday } from "@/lib/edupage";

const ORDER: Record<Weekday, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

const MS_PER_DAY = 86_400_000;

const shift = (date: ISODate, days: number): ISODate => {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return date;
  return new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY).toISOString().slice(0, 10);
};

/** The Monday of `date`'s week. A Saturday or Sunday belongs to the week just gone. */
export const startOfWeek = (date: ISODate): ISODate => shift(date, -ORDER[weekdayOf(date)]);

/** Mon–Fri of `date`'s week, in order. */
export const weekDates = (date: ISODate): ISODate[] => {
  const monday = startOfWeek(date);
  return [0, 1, 2, 3, 4].map((offset) => shift(monday, offset));
};

export type WeekPeriod = { period: string; start: HHMM; end: HHMM };

/** Period keys are strings from the source ("0".."12"); order them as the numbers they are. */
const periodNum = (period: string): number => {
  const n = Number(period);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The period rows a week actually uses, with the clock times that row runs between.
 *
 * An empty row 0 or row 12 is a wasted row in the grid — and a wasted band on a shared card —
 * so only periods some day in the week fills come back. A double lesson's `end` is the end of
 * the *whole block* (`resolveDay`), which would make row N claim row N+1's finishing time, so a
 * single-period lesson wins the row's times whenever the week has one.
 */
export const weekPeriods = (days: readonly (ResolvedDay | null)[]): WeekPeriod[] => {
  const rows = new Map<string, { times: WeekPeriod; exact: boolean }>();

  for (const day of days) {
    for (const lesson of day?.lessons ?? []) {
      const exact = lesson.span <= 1;
      const known = rows.get(lesson.period);
      if (known !== undefined && (known.exact || !exact)) continue;

      rows.set(lesson.period, {
        exact,
        times: { period: lesson.period, start: lesson.start, end: lesson.end },
      });
    }
  }

  return [...rows.values()]
    .map((row) => row.times)
    .sort((a, b) => periodNum(a.period) - periodNum(b.period));
};
