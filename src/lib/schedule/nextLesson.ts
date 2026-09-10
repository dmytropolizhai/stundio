/**
 * "Which lesson is on right now, and what is next" — the one piece of logic the app screen
 * and the home-screen widget must agree on (PLAN.md Phase 3 / parallel widget track).
 *
 * Deliberately pure and free of React, Capacitor and `Intl` formatting so the same rules can
 * be re-implemented in Kotlin against these tests. Wall clock is always Europe/Riga
 * (CLAUDE.md) — the device may sit in another timezone, the school never does.
 */
import type { HHMM, ISODate, ResolvedDay, ResolvedLesson } from "../edupage/index.ts";

/** Wall clock in Riga, decomposed: the calendar date plus minutes since local midnight. */
export type RigaClock = { date: ISODate; minutes: number };

const RIGA_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Riga",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const rigaClock = (now: Date = new Date()): RigaClock => {
  const parts = new Map(RIGA_PARTS.formatToParts(now).map((p) => [p.type, p.value]));
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.get(type) ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

/** "08:30" → 510. Returns null for the empty strings `resolveDay` emits for unknown periods. */
export const minutesOf = (time: HHMM): number | null => {
  const [h, m] = time.split(":");
  if (h === undefined || m === undefined) return null;
  const minutes = Number(h) * 60 + Number(m);
  return Number.isFinite(minutes) ? minutes : null;
};

export type LessonWindow = { lesson: ResolvedLesson; start: number; end: number };

/**
 * Lessons that actually take place, in time order. Cancelled ones stay visible in the list
 * (CLAUDE.md) but must never be reported as "current" or "next" — nobody attends them.
 */
export const timedLessons = (lessons: readonly ResolvedLesson[]): LessonWindow[] => {
  const windows: LessonWindow[] = [];
  for (const lesson of lessons) {
    if (lesson.status === "cancelled") continue;
    const start = minutesOf(lesson.start);
    const end = minutesOf(lesson.end);
    if (start === null || end === null || end < start) continue;
    windows.push({ lesson, start, end });
  }
  return windows.sort((a, b) => a.start - b.start || a.end - b.end);
};

export type DayProgress = {
  /** The lesson in progress right now, if the clock is inside its window. */
  current: ResolvedLesson | null;
  /** The next lesson that has not started yet, today. */
  next: ResolvedLesson | null;
  /** Whole minutes until `next` starts; null when there is none. */
  minutesUntilNext: number | null;
  /** Whole minutes left of `current`, rounded up so "1 min" never shows as 0. */
  minutesLeftInCurrent: number | null;
  /** 0–1 through `current`, for the progress bar on the lesson card. */
  progress: number | null;
  /** Minutes since Riga midnight — where the "now" marker sits on the day. */
  nowMinutes: number;
  /** True once every lesson of the day has ended. */
  finished: boolean;
};

const EMPTY = (nowMinutes: number, finished: boolean): DayProgress => ({
  current: null,
  next: null,
  minutesUntilNext: null,
  minutesLeftInCurrent: null,
  progress: null,
  nowMinutes,
  finished,
});

/**
 * Where the wall clock sits inside a resolved day.
 *
 * Only meaningful for *today*: asking about tomorrow would have to invent a "now", and the
 * caller (DayView header, widget) wants an explicit "not today" rather than a guess.
 */
export const dayProgress = (day: ResolvedDay | null, now: RigaClock): DayProgress => {
  if (day === null || day.date !== now.date) return EMPTY(now.minutes, false);

  const windows = timedLessons(day.lessons);
  if (windows.length === 0) return EMPTY(now.minutes, false);

  const current = windows.find((w) => now.minutes >= w.start && now.minutes < w.end) ?? null;
  const next = windows.find((w) => w.start > now.minutes) ?? null;
  const last = windows[windows.length - 1];

  return {
    current: current?.lesson ?? null,
    next: next?.lesson ?? null,
    minutesUntilNext: next === null ? null : next.start - now.minutes,
    minutesLeftInCurrent: current === null ? null : Math.ceil(current.end - now.minutes),
    progress:
      current === null
        ? null
        : Math.min(1, Math.max(0, (now.minutes - current.start) / (current.end - current.start))),
    nowMinutes: now.minutes,
    finished: current === null && next === null && last !== undefined && now.minutes >= last.end,
  };
};

/**
 * The widget's one-liner: the lesson to show on the home screen. Prefers the one in progress,
 * falls back to the one about to start. Returns null on an empty or finished day.
 */
export const glanceLesson = (
  day: ResolvedDay | null,
  now: RigaClock,
): { lesson: ResolvedLesson; live: boolean; minutes: number } | null => {
  const progress = dayProgress(day, now);
  if (progress.current !== null && progress.minutesLeftInCurrent !== null) {
    return { lesson: progress.current, live: true, minutes: progress.minutesLeftInCurrent };
  }
  if (progress.next !== null && progress.minutesUntilNext !== null) {
    return { lesson: progress.next, live: false, minutes: progress.minutesUntilNext };
  }
  return null;
};
