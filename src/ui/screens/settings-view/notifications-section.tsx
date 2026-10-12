import { useState } from "react";
import { Button } from "@/ds";
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
import { Section } from "./settings-section.tsx";
import { SettingsRow, StatusDot } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

const REMINDER_MINUTES = [0, 5, 10, 15, 30] as const;

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
  const [reminderOpen, setReminderOpen] = useState(false);

  const native = isNativePlatform();
  const title = t("settings.notifications");

  if (isIosDevice() && !isStandalonePwa()) {
    return (
      <Section title={title} icon="bell-off">
        {onShowIphoneInstall === undefined ? (
          <SettingsRow
            icon="square-plus"
            label={t("settings.iphoneInstall")}
            description={t("settings.notificationsIosPwaRequired")}
          />
        ) : (
          <SettingsRow
            icon="square-plus"
            label={t("settings.iphoneInstall")}
            description={t("settings.notificationsIosPwaRequired")}
            onClick={onShowIphoneInstall}
          />
        )}
      </Section>
    );
  }

  if (!native && !isWebPushSupported()) {
    return (
      <Section title={title} icon="bell-off">
        <SettingsRow
          icon="smartphone"
          label={t("settings.notificationsWebTitle")}
          description={t("settings.notificationsWebNotice")}
        />
      </Section>
    );
  }

  const reminderValue = (minutes: number) =>
    minutes > 0 ? t("settings.minutes", { minutes }) : t("settings.notifyLessonReminderOff");

  // A muted bell on the group title when nothing would ever be delivered.
  const allOff =
    !settings.notifySubstitutionChanges &&
    (!native ||
      (settings.notifyLessonReminderMinutes === 0 &&
        !settings.notifyNewTimetable &&
        !settings.notifyAppUpdates));

  return (
    <Section
      title={title}
      icon={allOff ? "bell-off" : "bell"}
      indicator={notifyPermissionDenied ? <StatusDot tone="danger" /> : undefined}
    >
      {notifyPermissionDenied && (
        <SettingsRow
          icon="triangle-alert"
          tone="alert"
          label={t("settings.notifyPermissionDeniedTitle")}
          description={t("settings.notifyPermissionDenied")}
          trailing={
            native ? (
              <Button
                size="sm"
                onClick={() => {
                  void openNotificationSettings();
                }}
              >
                {t("settings.notifyOpenSettings")}
              </Button>
            ) : undefined
          }
        />
      )}

      {native ? (
        <SettingsRow
          icon="alarm-clock"
          label={t("settings.notifyLessonReminder")}
          description={t("settings.notifyLessonReminderHint")}
          value={reminderValue(settings.notifyLessonReminderMinutes)}
          onClick={() => setReminderOpen(true)}
        />
      ) : (
        <SettingsRow
          icon="alarm-clock"
          label={t("settings.notifyLessonReminder")}
          description={t("settings.notificationsLessonRemindersNativeNotice")}
        />
      )}

      {native && exactAlarmDenied && settings.notifyLessonReminderMinutes > 0 && (
        <SettingsRow
          icon="triangle-alert"
          tone="alert"
          label={t("settings.notifyExactAlarmTitle")}
          description={t("settings.notifyExactAlarmDenied")}
          trailing={
            <Button
              size="sm"
              onClick={() => {
                void ensureExactAlarmPermission();
              }}
            >
              {t("settings.notifyOpenSettings")}
            </Button>
          }
        />
      )}

      <SettingsRow
        icon="repeat"
        label={t("settings.notifySubstitutionChanges")}
        description={t("settings.notifySubstitutionChangesHint")}
        checked={settings.notifySubstitutionChanges}
        onCheckedChange={(checked) => {
          if (native) {
            if (checked) void ensureNotificationPermission();
          } else if (checked) {
            // The class's display short or the teacher's name, never an id: those are the only
            // names the substitution feed publishes, so the only ones the server can file this
            // device under and later find again.
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

      {native && (
        <SettingsRow
          icon="calendar-days"
          label={t("settings.notifyNewTimetable")}
          description={t("settings.notifyNewTimetableHint")}
          checked={settings.notifyNewTimetable}
          onCheckedChange={(checked) => {
            if (checked) void ensureNotificationPermission();
            void setNotifyNewTimetable(checked);
          }}
        />
      )}
      {native && (
        <SettingsRow
          icon="download"
          label={t("settings.notifyAppUpdates")}
          description={t("settings.notifyAppUpdatesHint")}
          checked={settings.notifyAppUpdates}
          onCheckedChange={(checked) => {
            if (checked) void ensureNotificationPermission();
            void setNotifyAppUpdates(checked);
          }}
        />
      )}

      {native && (
        <ChoiceSheet
          open={reminderOpen}
          onClose={() => setReminderOpen(false)}
          icon="alarm-clock"
          title={t("settings.notifyLessonReminder")}
          description={t("settings.notifyLessonReminderHint")}
          options={REMINDER_MINUTES.map((minutes) => ({
            key: String(minutes),
            label:
              minutes > 0
                ? t("settings.reminderOption", { minutes })
                : t("settings.notifyLessonReminderOff"),
          }))}
          value={String(settings.notifyLessonReminderMinutes)}
          onChange={(value) => {
            const minutes = Number(value);
            if (minutes > 0) {
              // Both grants, in order: permission to show anything at all, then permission to
              // show it *on time*. Without the second one Android delivers the reminder whenever
              // Doze next wakes up.
              void ensureNotificationPermission().then((granted) => {
                if (granted) return ensureExactAlarmPermission();
                return granted;
              });
            }
            void setNotifyLessonReminderMinutes(minutes);
          }}
        />
      )}
    </Section>
  );
};
