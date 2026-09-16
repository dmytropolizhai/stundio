import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canInstallInApp, downloadAndInstall } from "@/lib/version";

export type InstallState =
  | { phase: "idle" }
  | { phase: "downloading"; percent: number }
  | { phase: "error"; message: string };

/**
 * Drives the "download the APK, then hand it to Android" flow behind the Settings update
 * button. `install` is fire-and-forget from the caller's side — state updates tell the UI
 * what to render. `phase` resets to "idle" once the install intent is handed off; the OS
 * install prompt itself is outside this app's process from that point on.
 */
export const useUpdateInstall = () => {
  const [state, setState] = useState<InstallState>({ phase: "idle" });
  const isMountedRef = useRef(true);
  const isInstallingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const install = useCallback(async (apkUrl: string) => {
    if (isInstallingRef.current) return;
    isInstallingRef.current = true;
    setState({ phase: "downloading", percent: 0 });
    try {
      await downloadAndInstall(apkUrl, (percent) => {
        if (isMountedRef.current) {
          setState({ phase: "downloading", percent });
        }
      });
      if (isMountedRef.current) {
        setState({ phase: "idle" });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Install failed",
        });
      }
    } finally {
      isInstallingRef.current = false;
    }
  }, []);

  const canInstall = useMemo(() => canInstallInApp(), []);

  return useMemo(
    () => ({
      ...state,
      install,
      canInstallInApp: canInstall,
    }),
    [state, install, canInstall],
  );
};
