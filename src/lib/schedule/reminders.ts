/**
 * "Remind me n minutes before this lesson" — pure planning, no Capacitor.
 *
 * Local notifications must all be scheduled up front (nothing re-runs this once a lesson's
 * reminder has fired), so this returns every remaining reminder for the day in one call. The
 * notification wiring layer (`src/notifications/`) diffs this against what is currently
 * scheduled and replaces it wholesale on every refresh/settings change.
 */
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { rigaTimeToDate, timedLessons } from "./nextLesson.ts";

export type LessonReminder = {
  /** Stable across recomputes for the same (date, period) — used as the OS notification id. */
  id: number;
  lesson: ResolvedLesson;
  /** The instant to fire at, already minutes-before the lesson start. */
  fireAt: Date;
};

/** FNV-1a into a positive 31-bit int — `LocalNotifications` ids are signed 32-bit. */
const stableId = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash & 0x7fffffff;
};

/**
 * Every lesson of `day` still ahead of `now`, each paired with the instant its reminder
 * should fire. `minutesBefore <= 0` means reminders are off (empty list). A reminder whose
 * fire time has already passed (the user opened the app mid-warning-window) is dropped rather
 * than fired immediately — a notification for a lesson already under way is just noise.
 */
export const lessonReminders = (
  day: ResolvedDay,
  minutesBefore: number,
  now: Date = new Date(),
): LessonReminder[] => {
  if (minutesBefore <= 0) return [];

  const reminders: LessonReminder[] = [];
  for (const { lesson, start } of timedLessons(day.lessons)) {
    const fireAt = rigaTimeToDate(day.date, start - minutesBefore);
    if (fireAt.getTime() <= now.getTime()) continue;
    reminders.push({ id: stableId(`${day.date}|${lesson.period}`), lesson, fireAt });
  }
  return reminders;
};
