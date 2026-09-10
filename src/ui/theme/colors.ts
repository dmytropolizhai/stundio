/**
 * Subject colour handling. EduPage gives each subject a hex colour ("#14C030"); it is the
 * only visual identity a lesson has, so the day and week views tint by it — but as a
 * 4px accent rail, never as a background, which would wreck contrast in both themes.
 */
import type { ResolvedStatus, SubjectRef } from "../../lib/edupage/index.ts";

const HEX = /^#?([0-9a-f]{6})$/i;

/** A CSS colour for the subject rail, or a neutral when EduPage left the colour empty. */
export const subjectColor = (subject: SubjectRef | null): string => {
  const raw = subject?.color ?? null;
  if (raw === null) return "currentColor";
  const match = HEX.exec(raw.trim());
  return match === null ? "currentColor" : `#${match[1]}`;
};

/**
 * Status → badge classes. Kept as one table so DayView, WeekView and LessonSheet cannot
 * drift into three different ideas of what "cancelled" looks like.
 */
export const STATUS_BADGE: Record<Exclude<ResolvedStatus, "normal">, string> = {
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  moved: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  substituted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  room_change: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  added: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

/** Small square dot used in the week grid, where there is no room for a word. */
export const STATUS_DOT: Record<Exclude<ResolvedStatus, "normal">, string> = {
  cancelled: "bg-rose-500",
  moved: "bg-violet-500",
  substituted: "bg-amber-500",
  room_change: "bg-sky-500",
  added: "bg-emerald-500",
};

export const isChanged = (status: ResolvedStatus): status is Exclude<ResolvedStatus, "normal"> =>
  status !== "normal";
