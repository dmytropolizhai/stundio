/**
 * The only file that talks to `@capacitor/local-notifications` directly (mirrors the isolation
 * `src/lib/edupage/http.ts` uses for `CapacitorHttp` — CLAUDE.md's spirit, applied here too).
 *
 * Three kinds of notification, three id ranges so cancelling one kind never touches another:
 *   - lesson reminders: one per (date, period), replaced wholesale on every reschedule
 *   - substitution changes: a single fixed id, re-fired (never queued) per changed date
 *   - app updates: a single fixed id, one-shot per version (caller dedupes via Settings)
 */
import { registerPlugin } from "@capacitor/core";
import { LocalNotifications, type ActionPerformed } from "@capacitor/local-notifications";
import type { ISODate, ResolvedLesson } from "../lib/edupage/index.ts";
import { rigaClock, type LessonReminder } from "../lib/schedule/index.ts";
import { translate, type Lang } from "../ui/i18n/index.ts";

/**
 * Carried in each notification's `extra` and read back in `onNotificationTap` once the user
 * taps it — this is the only thing that tells the tap listener what the notification was about,
 * since by then it's just an OS notification record.
 */
export type NotificationExtra =
  | { kind: "lesson"; date: ISODate }
  | { kind: "substitutionsChanged"; date: ISODate }
  | { kind: "appUpdate" };

/**
 * Backed by `AppSettingsPlugin.java` — once the OS permission is denied, `requestPermissions()`
 * can never show the dialog again, so the only way back in is the app's own settings screen.
 */
type AppSettingsPlugin = { openNotificationSettings(): Promise<void> };
const AppSettings = registerPlugin<AppSettingsPlugin>("AppSettings");

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

/** Never prompts — just reports whether permission is currently granted. */
export const hasNotificationPermission = async (): Promise<boolean> => {
  const current = await LocalNotifications.checkPermissions();
  return current.display === "granted";
};

/**
 * Never prompts — reports whether permission was actively denied, as opposed to just never
 * having been asked. Settings uses this to decide whether to offer "open system settings"
 * instead of the normal in-app request, since the OS won't show its dialog again either way.
 */
export const isNotificationPermissionDenied = async (): Promise<boolean> => {
  const current = await LocalNotifications.checkPermissions();
  return current.display === "denied";
};

/**
 * Deep-links into the app's own notification settings screen. This is the only way back in
 * once the user has denied the OS permission — `requestPermissions()` resolves "denied" silently
 * from then on, with no dialog shown, so the app can't re-ask directly.
 */
export const openNotificationSettings = async (): Promise<void> => {
  await AppSettings.openNotificationSettings();
};

/**
 * Whether the OS will let us schedule *exact* alarms.
 *
 * This is a second, separate grant from the notification permission and the one that decides
 * whether a reminder is on time: without it the plugin falls back to `setAndAllowWhileIdle`,
 * which Doze is free to batch into its next maintenance window — the ten-minutes-late reminder.
 * Android < 12 has no such setting and the plugin reports "granted"; everywhere the call is not
 * implemented at all (iOS, the browser) we assume exactness rather than nag about it.
 */
export const hasExactAlarmPermission = async (): Promise<boolean> => {
  try {
    const current = await LocalNotifications.checkExactNotificationSetting();
    return current.exact_alarm === "granted";
  } catch {
    return true;
  }
};

/**
 * Sends the user to the system's "Alarms & reminders" screen when exact alarms are denied,
 * and resolves to whether they are allowed once they come back. A no-op that resolves true
 * below Android 12 and off-Android, so callers need no platform check of their own.
 *
 * Only call this from somewhere the user has just asked for reminders — it leaves the app.
 */
export const ensureExactAlarmPermission = async (): Promise<boolean> => {
  try {
    if ((await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted") {
      return true;
    }
    const changed = await LocalNotifications.changeExactNotificationSetting();
    return changed.exact_alarm === "granted";
  } catch {
    return true;
  }
};

/**
 * Resolves false without prompting only when the user already said no; otherwise asks.
 * Only call this from a place the user has just been told *why* — the onboarding notification
 * slide, or a Settings toggle they turned on themselves. Never call it unconditionally on boot;
 * that's a cold OS permission dialog with no context, which is exactly what we don't want.
 */
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
      // `fireAt` is minutes-before the lesson start, so it still lands on the lesson's own day.
      extra: { kind: "lesson", date: rigaClock(r.fireAt).date } satisfies NotificationExtra,
    })),
  });
};

export const notifySubstitutionsChanged = async (
  title: string,
  body: string,
  date: ISODate,
): Promise<void> => {
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: CHANGE_ID,
        title,
        body,
        channelId: "schedule",
        extra: { kind: "substitutionsChanged", date } satisfies NotificationExtra,
      },
    ],
  });
};

export const notifyAppUpdate = async (title: string, body: string): Promise<void> => {
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: UPDATE_ID,
        title,
        body,
        channelId: "schedule",
        extra: { kind: "appUpdate" } satisfies NotificationExtra,
      },
    ],
  });
};

/**
 * Fires once for every tap on one of our notifications — including the tap that cold-launches
 * the app, which Capacitor queues until this listener is registered. Returns an unsubscribe;
 * `addListener` itself is async, so the handle isn't available until the next microtask, but
 * callers never need to await this — nothing here is used before it settles.
 */
export const onNotificationTap = (handler: (extra: NotificationExtra) => void): (() => void) => {
  const handle = LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (action: ActionPerformed) => {
      const extra = action.notification.extra as NotificationExtra | undefined;
      if (extra !== undefined) handler(extra);
    },
  );
  return () => {
    void handle.then((h) => h.remove());
  };
};
