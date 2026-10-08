import { Button, SegmentedTabs, Switch } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import {
  ensureExactAlarmPermission,
  ensureNotificationPermission,
  openNotificationSettings,
} from "@/notifications/localNotifications";
import { isWebPushSupported, subscribeWebPush, unsubscribeWebPush } from "@/notifications/webPush";
import { useAppStore } from "@/store";
import { useExactAlarmDenied } from "@/ui/hooks/useExactAlarmPermission.ts";
import { useNotificationPermissionDenied } from "@/ui/hooks/useNotificationPermission.ts";
import { useT } from "@/ui/i18n";
import { isIosDevice, isStandalonePwa } from "@/ui/lib/platform.ts";
import { Row, Section } from "./settings-section.tsx";

type NotificationsSectionProps = {
  onShowIphoneInstall?: (() => void) | undefined;
};

export const NotificationsSection = ({ onShowIphoneInstall }: NotificationsSectionProps) => {
  const t = useT();
  const notifyPermissionDenied = useNotificationPermissionDenied();
  const exactAlarmDenied = useExactAlarmDenied();
  const settings = useAppStore((s) => s.settings);
  const setNotifyLessonReminderMinutes = useAppStore((s) => s.setNotifyLessonReminderMinutes);
  const setNotifySubstitutionChanges = useAppStore((s) => s.setNotifySubstitutionChanges);
  const setNotifyNewTimetable = useAppStore((s) => s.setNotifyNewTimetable);
  const setNotifyAppUpdates = useAppStore((s) => s.setNotifyAppUpdates);
  const identityLabel = useAppStore((s) => s.identityLabel());

  const reminderOptions: { key: string; label: string }[] = [
    { key: "0", label: t("settings.notifyLessonReminderOff") },
    { key: "5", label: "5" },
    { key: "10", label: "10" },
    { key: "15", label: "15" },
    { key: "30", label: "30" },
  ];

  return (
    <Section title={t("settings.notifications")}>
      {isIosDevice() && !isStandalonePwa() ? (
        <Row className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-md">
            <p className="font-text text-body font-bold text-strong">
              {t("settings.notificationsIosPwaRequired")}
            </p>
          </div>
          {onShowIphoneInstall !== undefined && (
            <Button size="sm" icon="plus" onClick={onShowIphoneInstall}>
              {t("settings.iphoneInstall")}
            </Button>
          )}
        </Row>
      ) : !isNativePlatform() && !isWebPushSupported() ? (
        <Row>
          <p className="font-text text-caption text-muted">
            {t("settings.notificationsWebNotice")}
          </p>
        </Row>
      ) : (
        <>
          {notifyPermissionDenied && (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-text text-caption font-bold text-danger">
                {t("settings.notifyPermissionDenied")}
              </p>
              {isNativePlatform() && (
                <Button
                  size="sm"
                  icon="external-link"
                  onClick={() => {
                    void openNotificationSettings();
                  }}
                >
                  {t("settings.notifyOpenSettings")}
                </Button>
              )}
            </Row>
          )}
          {isNativePlatform() ? (
            <Row>
              <p className="mb-2 font-text text-body font-bold text-strong">
                {t("settings.notifyLessonReminder")}
              </p>
              <p className="mb-2.5 font-text text-caption text-muted">
                {t("settings.notifyLessonReminderHint")}
              </p>
              <SegmentedTabs
                label={t("settings.notifyLessonReminder")}
                value={String(settings.notifyLessonReminderMinutes)}
                items={reminderOptions}
                onChange={(value) => {
                  const minutes = Number(value);
                  if (minutes > 0) {
                    // Both grants, in order: permission to show anything at all, then
                    // permission to show it *on time*. Without the second one Android
                    // delivers the reminder whenever Doze next wakes up.
                    void ensureNotificationPermission().then((granted) => {
                      if (granted) return ensureExactAlarmPermission();
                      return granted;
                    });
                  }
                  void setNotifyLessonReminderMinutes(minutes);
                }}
              />
              {exactAlarmDenied && settings.notifyLessonReminderMinutes > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md font-text text-caption font-bold text-danger">
                    {t("settings.notifyExactAlarmDenied")}
                  </p>
                  <Button
                    size="sm"
                    icon="external-link"
                    onClick={() => {
                      void ensureExactAlarmPermission();
                    }}
                  >
                    {t("settings.notifyOpenSettings")}
                  </Button>
                </div>
              )}
            </Row>
          ) : (
            <Row>
              <p className="font-text text-caption text-muted">
                {t("settings.notificationsLessonRemindersNativeNotice")}
              </p>
            </Row>
          )}
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {t("settings.notifySubstitutionChanges")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.notifySubstitutionChangesHint")}
              </p>
            </div>
            <Switch
              aria-label={t("settings.notifySubstitutionChanges")}
              checked={settings.notifySubstitutionChanges}
              onChange={(checked) => {
                if (isNativePlatform()) {
                  if (checked) void ensureNotificationPermission();
                } else if (checked) {
                  // The class's display short or the teacher's name, never an id: those are
                  // the only names the substitution feed publishes, so the only ones the
                  // server can file this device under and later find again.
                  if (identityLabel !== null) {
                    void subscribeWebPush(
                      { persona: settings.persona, label: identityLabel },
                      settings.lang,
                    );
                  }
                } else {
                  void unsubscribeWebPush();
                }
                void setNotifySubstitutionChanges(checked);
              }}
            />
          </Row>
          {isNativePlatform() && (
            <Row className="flex items-start justify-between gap-3">
              <div>
                <p className="font-text text-body font-bold text-strong">
                  {t("settings.notifyNewTimetable")}
                </p>
                <p className="mt-0.5 font-text text-caption text-muted">
                  {t("settings.notifyNewTimetableHint")}
                </p>
              </div>
              <Switch
                aria-label={t("settings.notifyNewTimetable")}
                checked={settings.notifyNewTimetable}
                onChange={(checked) => {
                  if (checked) void ensureNotificationPermission();
                  void setNotifyNewTimetable(checked);
                }}
              />
            </Row>
          )}
          {isNativePlatform() && (
            <Row className="flex items-start justify-between gap-3">
              <div>
                <p className="font-text text-body font-bold text-strong">
                  {t("settings.notifyAppUpdates")}
                </p>
                <p className="mt-0.5 font-text text-caption text-muted">
                  {t("settings.notifyAppUpdatesHint")}
                </p>
              </div>
              <Switch
                aria-label={t("settings.notifyAppUpdates")}
                checked={settings.notifyAppUpdates}
                onChange={(checked) => {
                  if (checked) void ensureNotificationPermission();
                  void setNotifyAppUpdates(checked);
                }}
              />
            </Row>
          )}
        </>
      )}
    </Section>
  );
};
