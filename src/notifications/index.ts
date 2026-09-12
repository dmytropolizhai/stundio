export {
  ensureNotificationPermission,
  hasNotificationPermission,
  isNotificationPermissionDenied,
  notifyAppUpdate,
  notifySubstitutionsChanged,
  openNotificationSettings,
  rescheduleLessonReminders,
} from "./localNotifications.ts";
export { wireNotifications, notifyOnChanges, checkForAppUpdateNotification } from "./wire.ts";
