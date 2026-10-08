export {
  ensureExactAlarmPermission,
  ensureNotificationPermission,
  hasExactAlarmPermission,
  hasNotificationPermission,
  isNotificationPermissionDenied,
  notifyAppUpdate,
  notifyNewTimetable,
  notifySubstitutionsChanged,
  openNotificationSettings,
  rescheduleLessonReminders,
} from "./localNotifications.ts";
export {
  wireNotifications,
  wireNotificationTaps,
  notifyOnChanges,
  notifyOnNewTimetable,
  checkForAppUpdateNotification,
} from "./wire.ts";
export {
  isWebPushSupported,
  getWebPushPermission,
  requestWebPushPermission,
  getExistingWebPushSubscription,
  subscribeWebPush,
  refreshWebPushSubscription,
  unsubscribeWebPush,
  reportSubstitutionChangeToServer,
  type PushTarget,
} from "./webPush.ts";
