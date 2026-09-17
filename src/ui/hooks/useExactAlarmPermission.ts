import { useCallback, useEffect, useState } from "react";
import { isNativePlatform } from "@/lib/edupage";
import { hasExactAlarmPermission } from "@/notifications/localNotifications";

/**
 * Tracks whether Android is currently refusing us *exact* alarms — the grant that decides
 * whether a lesson reminder lands on time or whenever Doze next wakes up (ten-odd minutes
 * late, in practice). Distinct from the notification permission: reminders are delivered
 * either way, just late, so Settings shows this as its own row.
 *
 * Re-checks on focus, the same way `useNotificationPermissionDenied` does — the only way to
 * grant it on Android 14+ is the system "Alarms & reminders" screen, i.e. outside the app.
 */
export const useExactAlarmDenied = (): boolean => {
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(() => {
    if (!isNativePlatform()) {
      setDenied(false);
      return;
    }
    void hasExactAlarmPermission()
      .then((allowed) => setDenied(!allowed))
      .catch(() => setDenied(false));
  }, []);

  useEffect(() => {
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [refresh]);

  return denied;
};
