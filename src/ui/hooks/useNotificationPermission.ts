import { useCallback, useEffect, useState } from "react";
import { isNotificationPermissionDenied } from "@/notifications";

/**
 * Tracks whether the OS notification permission is actively denied, as opposed to never asked.
 * Settings needs this to offer "open system settings" instead of the normal toggle prompt, since
 * once denied, `requestPermissions()` can never show the OS dialog again.
 *
 * Re-checks when the app regains focus, so flipping the permission on in system settings (the
 * only way back in) is picked up the moment the user returns to Settings, without a manual
 * refresh button.
 */
export const useNotificationPermissionDenied = (): boolean => {
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(() => {
    // Web (dev server, tests) has no local-notifications plugin at all — swallow that as
    // "not denied" rather than letting it surface as an unhandled rejection.
    void isNotificationPermissionDenied()
      .then(setDenied)
      .catch(() => setDenied(false));
  }, []);

  useEffect(() => {
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [refresh]);

  return denied;
};
