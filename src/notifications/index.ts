export {
  ensureNotificationPermission,
  hasNotificationPermission,
  notifyAppUpdate,
  notifySubstitutionsChanged,
  rescheduleLessonReminders,
} from "./localNotifications.ts";
export { wireNotifications, notifyOnChanges, checkForAppUpdateNotification } from "./wire.ts";
