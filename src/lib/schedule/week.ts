/**
 * School-week arithmetic for the week pager. Mon–Fri only: RVT publishes no weekend
 * lessons, and a two-column-wider grid for two always-empty days is a worse screen.
 */
import { weekdayOf, type ISODate, type Weekday } from "../edupage/index.ts";

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
