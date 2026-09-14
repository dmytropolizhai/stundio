/**
 * Ties the pure planning (`src/lib/schedule/`) to the OS (`localNotifications.ts`) and the
 * store. Nothing in here computes a fire time or a diff itself — it only decides *when* to
 * re-run those and hands the result to the plugin.
 */
import { checkForUpdate } from "../lib/version/index.ts";
import { rigaClock, lessonReminders } from "../lib/schedule/index.ts";
import { translate } from "../ui/i18n/index.ts";
import type { Store } from "../store/index.ts";
import type { SyncOutcome } from "../sync/index.ts";
import {
  hasNotificationPermission,
  notifyAppUpdate,
  notifySubstitutionsChanged,
  onNotificationTap,
  rescheduleLessonReminders,
  type NotificationExtra,
} from "./localNotifications.ts";

const UPDATE_OWNER = "dmytropolizhai";
const UPDATE_REPO = "stundio";

/** Cheap enough to compare on every store tick instead of re-scheduling unconditionally. */
const reminderFingerprint = (ids: readonly { id: number; fireAt: Date }[]): string =>
  ids.map((r) => `${r.id}@${r.fireAt.getTime()}`).join(",");

export const wireNotifications = (store: Store): { dispose: () => void } => {
  // `null`, not `""`: an empty reminder list must still be scheduled once (it cancels
  // whatever an earlier run of the app left pending), so the very first check can't be a
  // no-op just because there happen to be no reminders today.
  let lastReminderFingerprint: string | null = null;

  const syncLessonReminders = (): void => {
    const state = store.getState();
    if (!state.ready) return;

    const today = rigaClock().date;
    const day = state.resolvedDay(today);
    const minutes = state.settings.notifyLessonReminderMinutes;
    const reminders = day === null ? [] : lessonReminders(day, minutes);

    const fingerprint = reminderFingerprint(reminders);
    if (fingerprint === lastReminderFingerprint) return;
    lastReminderFingerprint = fingerprint;

    void rescheduleLessonReminders(reminders, minutes, state.settings.lang);
  };

  // Never prompts here — the OS ask only happens where the user has just been told why
  // (the onboarding notification slide, or turning a Settings toggle on). This just checks
  // whether a *previous* grant means reminders can actually be scheduled.
  void hasNotificationPermission().then(syncLessonReminders);
  const unsubscribe = store.subscribe(syncLessonReminders);

  return { dispose: unsubscribe };
};

/**
 * Called after every sync (initial + resume-triggered). `hadPreviousSync` gates the very
 * first sync of a fresh install — there is no earlier snapshot to have "changed" from, so
 * everything would otherwise read as a change.
 */
export const notifyOnChanges = (
  store: Store,
  outcome: SyncOutcome,
  hadPreviousSync: boolean,
): void => {
  const { settings } = store.getState();
  if (!hadPreviousSync || !settings.notifySubstitutionChanges) return;
  const today = rigaClock().date;
  // Today if it changed, otherwise the nearest day still ahead — the day the tap should open.
  const target = outcome.changedDates.includes(today)
    ? today
    : outcome.changedDates
        .filter((d) => d > today)
        .sort()
        .at(0);
  if (target === undefined) return;

  void notifySubstitutionsChanged(
    translate(settings.lang, "notification.changed.title"),
    translate(settings.lang, "notification.changed.body"),
    target,
  );
};

/**
 * Registers the tap listener once and keeps it registered for the life of the app — unlike
 * `wireNotifications`, there's nothing to resubscribe on store changes.
 */
export const wireNotificationTaps = (store: Store): { dispose: () => void } => {
  const dispose = onNotificationTap((extra: NotificationExtra) => {
    const { setPendingNavigation } = store.getState();
    switch (extra.kind) {
      case "lesson":
      case "substitutionsChanged":
        setPendingNavigation({ tab: "day", date: extra.date });
        break;
      case "appUpdate":
        setPendingNavigation({ tab: "settings" });
        break;
    }
  });
  return { dispose };
};

/** One check per app open (mirrors `useUpdateCheck`), but this path can also fire a notification. */
export const checkForAppUpdateNotification = async (store: Store): Promise<void> => {
  const { settings, setLastNotifiedUpdateVersion } = store.getState();
  if (!settings.notifyAppUpdates) return;

  const result = await checkForUpdate(__APP_VERSION__, UPDATE_OWNER, UPDATE_REPO);
  if (result === null || !result.hasUpdate) return;
  if (result.latestVersion === settings.lastNotifiedUpdateVersion) return;

  await notifyAppUpdate(
    translate(settings.lang, "notification.update.title"),
    translate(settings.lang, "notification.update.body", { version: result.latestVersion }),
  );
  await setLastNotifiedUpdateVersion(result.latestVersion);
};
