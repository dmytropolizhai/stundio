/**
 * The only file that talks to `@capacitor/local-notifications` directly (mirrors the isolation
 * `src/lib/edupage/http.ts` uses for `CapacitorHttp` — CLAUDE.md's spirit, applied here too).
 *
 * Three kinds of notification, three id ranges so cancelling one kind never touches another:
 *   - lesson reminders: one per (date, period), replaced wholesale on every reschedule
 *   - substitution changes: a single fixed id, re-fired (never queued) per changed date
 *   - app updates: a single fixed id, one-shot per version (caller dedupes via Settings)
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import type { ResolvedLesson } from "../lib/edupage/index.ts";
import type { LessonReminder } from "../lib/schedule/index.ts";
import { translate, type Lang } from "../ui/i18n/index.ts";

const CHANGE_ID = 1;
const UPDATE_ID = 2;
/** Lesson reminder ids are hashed into this band so they never collide with the two above. */
const LESSON_ID_BAND = 1000;

const lessonNotificationId = (id: number): number => LESSON_ID_BAND + (id % 1_000_000_000);

const lessonTitle = (lesson: ResolvedLesson, minutesBefore: number, lang: Lang): string =>
  translate(lang, "notification.lessonReminder.title", {
    subject: lesson.subject?.short ?? "",
    minutes: minutesBefore,
  });

const lessonBody = (lesson: ResolvedLesson): string =>
  [lesson.rooms.map((r) => r.short).join(", "), lesson.teachers.map((t) => t.short).join(", ")]
    .filter(Boolean)
    .join(" · ");

/** Android 8+ needs a channel before anything on it will show. Idempotent — safe to call often. */
const ensureChannel = async (): Promise<void> => {
  await LocalNotifications.createChannel({
    id: "schedule",
    name: "Stundu saraksts",
    description: "Atgādinājumi par stundām un izmaiņām",
    importance: 4,
  });
};

/** Resolves false without prompting only when the user already said no; otherwise asks. */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  if (current.display === "denied") return false;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
};

/**
 * Replaces every currently-scheduled lesson reminder with `reminders`. Cancelling the whole
 * band first (rather than diffing) is simpler and cheap: there are at most a handful of
 * lessons left in a day.
 */
export const rescheduleLessonReminders = async (
  reminders: readonly LessonReminder[],
  minutesBefore: number,
  lang: Lang,
): Promise<void> => {
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter(
    (n) => n.id >= LESSON_ID_BAND && n.id < LESSON_ID_BAND + 1_000_000_000,
  );
  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  }
  if (reminders.length === 0) return;

  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: reminders.map((r) => ({
      id: lessonNotificationId(r.id),
      title: lessonTitle(r.lesson, minutesBefore, lang),
      body: lessonBody(r.lesson),
      channelId: "schedule",
      schedule: { at: r.fireAt, allowWhileIdle: true },
    })),
  });
};

export const notifySubstitutionsChanged = async (title: string, body: string): Promise<void> => {
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [{ id: CHANGE_ID, title, body, channelId: "schedule" }],
  });
};

export const notifyAppUpdate = async (title: string, body: string): Promise<void> => {
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [{ id: UPDATE_ID, title, body, channelId: "schedule" }],
  });
};
