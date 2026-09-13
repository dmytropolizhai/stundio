export {
  ensureNotificationPermission,
  hasNotificationPermission,
  isNotificationPermissionDenied,
  notifyAppUpdate,
  notifySubstitutionsChanged,
  openNotificationSettings,
  rescheduleLessonReminders,
} from "./localNotifications.ts";
export {
  wireNotifications,
  wireNotificationTaps,
  notifyOnChanges,
  checkForAppUpdateNotification,
} from "./wire.ts";
