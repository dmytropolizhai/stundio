/**
 * Home-tab notice for a blocked notification permission. A denial is otherwise invisible: the
 * browser asks once, the answer sticks, and nothing in the app says reminders and substitution
 * alerts will never arrive. Android can deep-link to the app's notification settings; a browser
 * offers no way to re-prompt or open its site settings, so on the web the notice is text only.
 */
import { Button, Card, Icon } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import { openNotificationSettings } from "@/notifications/localNotifications";
import { useNotificationPermissionDenied } from "@/ui/hooks/useNotificationPermission.ts";
import { useT } from "@/ui/i18n";

export const NotificationBlockedNotice = () => {
  const t = useT();
  const denied = useNotificationPermissionDenied();
  const native = isNativePlatform();

  if (!denied) return null;

  return (
    <Card
      tone="amber"
      radius="lg"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 font-text text-caption"
      data-testid="notify-blocked"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Icon name="bell-off" size={16} className="shrink-0" />
        {native ? t("home.notifyBlocked") : t("home.notifyBlockedWeb")}
      </span>
      {native && (
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
    </Card>
  );
};
