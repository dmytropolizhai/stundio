/**
 * Countdown math for the Home screen's school tile: turns a `DayBrief` and the current Riga
 * clock into the compact/expanded countdown figure, a later day's start time, or a resting
 * face (`done` / `free`). Pure and React-free, like the rest of `lib/schedule`.
 */
import type { HHMM } from "@/lib/edupage";
import type { DayBrief } from "./brief.ts";
import { minutesOf } from "./nextLesson.ts";

export type SchoolCountdown =
  | {
      kind: "until";
      target: "end" | "start";
      minutes: number;
      hours: number;
      rest: number;
    }
  | { kind: "startsAt"; start: HHMM }
  | { kind: "done"; end: HHMM }
  | { kind: "free" };

export type UntilCountdown = Extract<SchoolCountdown, { kind: "until" }>;

const untilFrom = (target: "end" | "start", hhmm: HHMM, nowMinutes: number): UntilCountdown => {
  const targetMinutes = minutesOf(hhmm);
  const minutes = targetMinutes === null ? 0 : Math.max(0, targetMinutes - nowMinutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return { kind: "until", target, minutes, hours, rest };
};

export const schoolCountdown = (
  brief: DayBrief | null,
  nowMinutes: number,
  laterDay: boolean,
): SchoolCountdown | null => {
  if (brief === null) return null;
  switch (brief.kind) {
    case "ongoing":
      return untilFrom("end", brief.end, nowMinutes);
    case "ahead":
      if (laterDay) return { kind: "startsAt", start: brief.start };
      return untilFrom("start", brief.start, nowMinutes);
    case "finished":
      return { kind: "done", end: brief.end };
    case "free":
      return { kind: "free" };
  }
};

/** Compact face: `"2+"` when at least one whole hour remains, else plain minutes with a unit. */
export const formatCompactCountdown = (
  countdown: UntilCountdown,
): { value: string; showMinUnit: boolean } =>
  countdown.hours >= 1
    ? { value: `${String(countdown.hours)}+`, showMinUnit: false }
    : { value: String(countdown.minutes), showMinUnit: true };

/** Expanded face: `h:mm`, zero-padded minutes. */
export const formatFullCountdown = (countdown: UntilCountdown): string =>
  `${String(countdown.hours)}:${String(countdown.rest).padStart(2, "0")}`;

/**
 * Fraction of the school day elapsed (`0` at or before the first bell, `1` at or after the
 * last bell), or `null` when there is no school day to measure (`null` brief or `free` day).
 * Drives the fluid fill level in the Home school tile.
 */
export const schoolDayProgress = (
  brief: DayBrief | null,
  nowMinutes: number,
  laterDay: boolean,
): number | null => {
  if (brief === null) return null;
  switch (brief.kind) {
    case "ongoing": {
      if (laterDay) return 0;
      const startMin = minutesOf(brief.start);
      const endMin = minutesOf(brief.end);
      if (startMin === null || endMin === null || endMin <= startMin) {
        return endMin !== null && nowMinutes >= endMin ? 1 : 0;
      }
      return Math.min(1, Math.max(0, (nowMinutes - startMin) / (endMin - startMin)));
    }
    case "ahead":
      return 0;
    case "finished":
      return 1;
    case "free":
      return null;
  }
};
