/**
 * Today in a sentence, for the top of the Home screen: how much of the school day is ahead of
 * the clock. The glance answers "which lesson"; this answers "how much is left" — and says so
 * plainly on a day with nothing on it. Cancelled lessons never count (see `timedLessons`).
 */
import type { HHMM, ResolvedDay } from "@/lib/edupage";
import { timedLessons, type RigaClock } from "./nextLesson.ts";

export type DayBrief =
  /** Before the first lesson. */
  | { kind: "ahead"; lessonCount: number; start: HHMM; end: HHMM; changedCount: number }
  /** Between the first lesson's start and the last one's end. `remaining` includes the current one. */
  | { kind: "ongoing"; remaining: number; end: HHMM; changedCount: number }
  | { kind: "finished"; end: HHMM }
  /** Nothing takes place: a weekend, a holiday, or every lesson cancelled. */
  | { kind: "free" };

/** `null` when there is no data for the day — the screen says that elsewhere. */
export const dayBrief = (day: ResolvedDay | null, now: RigaClock): DayBrief | null => {
  if (day === null) return null;
  const windows = timedLessons(day.lessons);
  const first = windows[0];
  if (first === undefined) return { kind: "free" };

  const lastEnd = Math.max(...windows.map((w) => w.end));
  const last = windows.find((w) => w.end === lastEnd) ?? first;
  const changedCount = day.lessons.filter((l) => l.status !== "normal").length;

  if (day.date !== now.date || now.minutes < first.start) {
    return {
      kind: "ahead",
      lessonCount: windows.length,
      start: first.lesson.start,
      end: last.lesson.end,
      changedCount,
    };
  }
  if (now.minutes >= lastEnd) return { kind: "finished", end: last.lesson.end };
  return {
    kind: "ongoing",
    remaining: windows.filter((w) => w.end > now.minutes).length,
    end: last.lesson.end,
    changedCount,
  };
};
