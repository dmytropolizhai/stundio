/**
 * School-week arithmetic for the week pager. Mon–Fri only: RVT publishes no weekend
 * lessons, and a two-column-wider grid for two always-empty days is a worse screen.
 */
import { weekdayOf, type HHMM, type ISODate, type ResolvedDay, type Weekday } from "@/lib/edupage";

import { minutesOf } from "./nextLesson.ts";

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

export const DEFAULT_PERIOD_TIMES: Record<string, { start: HHMM; end: HHMM }> = {
  "0": { start: "07:45", end: "08:25" },
  "1": { start: "08:30", end: "09:10" },
  "2": { start: "09:15", end: "09:55" },
  "3": { start: "10:10", end: "10:50" },
  "4": { start: "10:55", end: "11:35" },
  "5": { start: "12:05", end: "12:45" },
  "6": { start: "12:50", end: "13:30" },
  "7": { start: "13:35", end: "14:15" },
  "8": { start: "14:20", end: "15:00" },
  "9": { start: "15:05", end: "15:45" },
  "10": { start: "15:50", end: "16:30" },
  "11": { start: "16:35", end: "17:15" },
  "12": { start: "17:20", end: "18:00" },
};

/**
 * The period rows a week actually uses, with the clock times that row runs between.
 *
 * An empty row 0 or row 12 is a wasted row in the grid — and a wasted band on a shared card —
 * so only periods some day in the week fills come back. Multi-period lessons (span > 1) occupy
 * all periods across their duration, and each covered period row is included. A double lesson's
 * `end` is the end of the *whole block* (`resolveDay`), which would make row N claim row N+1's
 * finishing time, so a single-period lesson or the school's period bells win the row's times
 * whenever available.
 */
export const weekPeriods = (days: readonly (ResolvedDay | null)[]): WeekPeriod[] => {
  const periodDefs = new Map<string, { start: HHMM; end: HHMM }>();
  for (const day of days) {
    for (const p of day?.periods ?? []) {
      if (!periodDefs.has(p.period) && p.start !== "" && p.end !== "") {
        periodDefs.set(p.period, { start: p.start, end: p.end });
      }
    }
  }

  const rows = new Map<string, { times: WeekPeriod; exact: boolean }>();

  for (const day of days) {
    for (const lesson of day?.lessons ?? []) {
      const startNum = periodNum(lesson.period);
      const span = Math.max(1, lesson.span);

      for (let offset = 0; offset < span; offset += 1) {
        const pKey = String(startNum + offset);
        const exact = span === 1;

        const known = rows.get(pKey);
        if (known !== undefined && (known.exact || !exact)) continue;

        const def = periodDefs.get(pKey);
        const fallbackDef = DEFAULT_PERIOD_TIMES[pKey];

        if (exact) {
          rows.set(pKey, {
            exact: true,
            times: { period: pKey, start: lesson.start, end: lesson.end },
          });
        } else if (def !== undefined) {
          rows.set(pKey, {
            exact: false,
            times: { period: pKey, start: def.start, end: def.end },
          });
        } else if (offset === 0) {
          rows.set(pKey, {
            exact: false,
            times: { period: pKey, start: lesson.start, end: lesson.end },
          });
        } else if (fallbackDef !== undefined) {
          rows.set(pKey, {
            exact: false,
            times: { period: pKey, start: fallbackDef.start, end: fallbackDef.end },
          });
        } else {
          rows.set(pKey, {
            exact: false,
            times: {
              period: pKey,
              start: known?.times.start ?? "",
              end: offset === span - 1 ? lesson.end : (known?.times.end ?? lesson.end),
            },
          });
        }
      }
    }
  }

  return [...rows.values()]
    .map((row) => row.times)
    .sort((a, b) => periodNum(a.period) - periodNum(b.period));
};

/** A pause between two lessons at least this long is the school's "big" break. */
export const LONG_BREAK_MINUTES = 20;

/**
 * The long breaks in a week's period rows, as period key → length in minutes, keyed by the row
 * the break comes *before*. Only neighbouring period numbers count: a row nobody has a lesson in
 * leaves a hole in `periods`, and that hole is an empty slot, not a break.
 */
export const longBreaks = (
  periods: readonly WeekPeriod[],
  minMinutes = LONG_BREAK_MINUTES,
): Map<string, number> => {
  const breaks = new Map<string, number>();

  periods.forEach((current, i) => {
    const previous = periods[i - 1];
    if (previous === undefined || periodNum(previous.period) + 1 !== periodNum(current.period)) {
      return;
    }
    const from = minutesOf(previous.end);
    const to = minutesOf(current.start);
    if (from !== null && to !== null && to - from >= minMinutes) {
      breaks.set(current.period, to - from);
    }
  });

  return breaks;
};
