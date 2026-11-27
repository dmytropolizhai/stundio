/**
 * The one place Settings says whether the app is in a good state: when the data was last
 * refreshed (with the refresh button, so "is this old?" and "make it new" sit together) and, only
 * when something would stop alerts reaching the phone, a caution line that fixes it. When nothing
 * is wrong this is a single calm line — offline is normal here, never alarming (PRODUCT.md) — so
 * the one coloured thing on the screen is always the thing to act on.
 */
import { Button, Card, Icon, IconButton, cn } from "@/ds";
import { currentPlatform, hasAppNotifications } from "@/lib/platform";
import { openNotificationSettings } from "@/notifications/localNotifications";
import { useAppStore } from "@/store";
import { useNotificationPermissionDenied } from "@/ui/hooks/useNotificationPermission.ts";
import { useSyncSummary } from "@/ui/hooks/useSyncSummary.ts";
import { useT } from "@/ui/i18n";
import { StatusDot } from "./settings-row.tsx";

const DOT = {
  synced: "success",
  syncing: "warning",
  offline: "offline",
  failed: "danger",
} as const;

export const StatusStrip = () => {
  const t = useT();
  const { state, label } = useSyncSummary();
  const refresh = useAppStore((s) => s.refresh);
  const notifyPermissionDenied = useNotificationPermissionDenied();
  const native = hasAppNotifications(currentPlatform());
  const syncing = state === "syncing";

  return (
    <Card radius="xl" className="mb-8 overflow-hidden p-0">
      <div className="flex min-h-14 items-center gap-3 py-1 pr-2 pl-4">
        <StatusDot tone={DOT[state]} />
        <span
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 truncate font-text text-body font-medium text-strong"
        >
          {label}
        </span>
        <IconButton
          icon="refresh-cw"
          variant="bare"
          size="sm"
          label={t("settings.sync")}
          disabled={syncing}
          onClick={() => {
            void refresh({ force: true });
          }}
          className={cn(syncing && "[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none")}
        />
      </div>

      {notifyPermissionDenied && (
        <div className="relative flex items-start gap-3.5 px-4 py-3.5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-hairline">
          <Icon name="triangle-alert" size={20} className="mt-0.5 shrink-0 text-caution" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-text text-body leading-snug font-semibold text-strong">
              {t("settings.notifyPermissionDeniedTitle")}
            </span>
            <span className="font-text text-caption text-fg">
              {t("settings.notifyPermissionDenied")}
            </span>
            {native && (
              <Button
                size="sm"
                className="mt-2 self-start"
                onClick={() => {
                  void openNotificationSettings();
                }}
              >
                {t("settings.notifyOpenSettings")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
