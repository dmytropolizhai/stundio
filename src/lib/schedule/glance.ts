/**
 * What the top of the day screen says before the lesson list does: the lesson to look at right
 * now, a one-line outline of the day, and — once school is out — a peek at tomorrow.
 *
 * Pure and React-free like the rest of `lib/schedule`: it only composes `dayProgress` and
 * `timedLessons`, so the "now / next" answer stays identical to the widget's. Cancelled lessons
 * never count (nobody attends them), which is also why a cancelled first lesson moves "starts
 * at" later and a cancelled last one moves "ends at" earlier — that is the time a student
 * actually cares about.
 */
import type { Building, HHMM, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayProgress, timedLessons, type RigaClock } from "./nextLesson.ts";

/** Shorter than this is a break between lessons, not a free period worth naming. */
export const FREE_PERIOD_MIN_MINUTES = 20;

const buildingOf = (day: ResolvedDay, lesson: ResolvedLesson): Building =>
  lesson.building ?? day.building;

export type DayGlance =
  | {
      kind: "live";
      lesson: ResolvedLesson;
      minutesLeft: number;
      /** 0–1 through the lesson. */
      progress: number;
      /** The lesson after this one, today — null on the last lesson. */
      following: ResolvedLesson | null;
      /** True when `following` is in another building than the lesson in progress. */
      followingHop: boolean;
    }
  | {
      kind: "upcoming";
      lesson: ResolvedLesson;
      minutesUntil: number;
      /** The lesson that just ended before this break, or null before the first lesson of the day. */
      previous: ResolvedLesson | null;
      /** 0–1 through the break between `previous` and `lesson`, or null before the first lesson. */
      breakProgress: number | null;
      /** True when this lesson is in another building than the previous one (a mid-day walk). */
      hop: boolean;
      /** The building to leave, when `hop` is true. */
      from: Building | null;
    }
  | { kind: "finished" };

/**
 * The lesson to look at right now. `null` unless `now` falls on the day itself (asking about
 * another date would have to invent a "now") or the day has no lessons that take place.
 */
export const dayGlance = (day: ResolvedDay | null, now: RigaClock): DayGlance | null => {
  if (day === null) return null;
  const progress = dayProgress(day, now);
  const windows = timedLessons(day.lessons);

  if (progress.current !== null && progress.minutesLeftInCurrent !== null) {
    const current = progress.current;
    const index = windows.findIndex((w) => w.lesson === current);
    const following = windows[index + 1]?.lesson ?? null;
    return {
      kind: "live",
      lesson: current,
      minutesLeft: progress.minutesLeftInCurrent,
      progress: progress.progress ?? 0,
      following,
      followingHop: following !== null && buildingOf(day, following) !== buildingOf(day, current),
    };
  }

  if (progress.next !== null && progress.minutesUntilNext !== null) {
    const next = progress.next;
    const index = windows.findIndex((w) => w.lesson === next);
    const nextWindow = windows[index];
    const prevWindow = windows[index - 1];
    const previous = prevWindow?.lesson ?? null;
    const breakDuration =
      prevWindow !== undefined && nextWindow !== undefined ? nextWindow.start - prevWindow.end : 0;
    const breakProgress =
      prevWindow !== undefined && breakDuration > 0
        ? Math.min(1, Math.max(0, (now.minutes - prevWindow.end) / breakDuration))
        : null;
    const from = previous === null ? null : buildingOf(day, previous);
    const hop = from !== null && from !== buildingOf(day, next);
    return {
      kind: "upcoming",
      lesson: next,
      minutesUntil: progress.minutesUntilNext,
      previous,
      breakProgress,
      hop,
      from: hop ? from : null,
    };
  }

  return progress.finished ? { kind: "finished" } : null;
};

export type LongestBreak = {
  /** Length of the longest single break between lessons, in minutes. */
  minutes: number;
  /** When the break begins (end of the preceding lesson). */
  start: HHMM;
  /** When the break ends (start of the following lesson). */
  end: HHMM;
};

export type DaySummary = {
  /** Start of the first lesson that takes place. */
  start: HHMM;
  /** End of the last one. */
  end: HHMM;
  lessonCount: number;
  /** Total length of the free periods in between (gaps of `FREE_PERIOD_MIN_MINUTES` or more). */
  freeMinutes: number;
  /** Longest single break between two consecutive lessons, or `null` when none exists. */
  longestBreak: LongestBreak | null;
};

/** The day in one line. `null` when nothing takes place. */
export const daySummary = (day: ResolvedDay | null): DaySummary | null => {
  if (day === null) return null;
  const windows = timedLessons(day.lessons);
  const first = windows[0];
  const last = windows[windows.length - 1];
  if (first === undefined || last === undefined) return null;

  let freeMinutes = 0;
  let longestBreak: LongestBreak | null = null;
  let previousEnd = first.end;
  let previousEndTime = first.lesson.end;
  for (const w of windows.slice(1)) {
    const gap = w.start - previousEnd;
    if (gap >= FREE_PERIOD_MIN_MINUTES) freeMinutes += gap;
    if (gap > 0 && (longestBreak === null || gap > longestBreak.minutes)) {
      longestBreak = { minutes: gap, start: previousEndTime, end: w.lesson.start };
    }
    if (w.end > previousEnd) {
      previousEnd = w.end;
      previousEndTime = w.lesson.end;
    }
  }

  return {
    start: first.lesson.start,
    end: last.lesson.end,
    lessonCount: windows.length,
    freeMinutes,
    longestBreak,
  };
};

export type TomorrowPreview = {
  first: ResolvedLesson;
  start: HHMM;
  lessonCount: number;
  /** Lessons that are anything but "as usual" — substituted, moved, cancelled, room change… */
  changedCount: number;
};

/** What to know tonight about the next school day. `null` when it has no lessons or no data. */
export const tomorrowPreview = (day: ResolvedDay | null): TomorrowPreview | null => {
  if (day === null) return null;
  const windows = timedLessons(day.lessons);
  const first = windows[0];
  if (first === undefined) return null;
  return {
    first: first.lesson,
    start: first.lesson.start,
    lessonCount: windows.length,
    changedCount: day.lessons.filter((l) => l.status !== "normal").length,
  };
};
