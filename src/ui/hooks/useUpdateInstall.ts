import { useCallback, useState } from "react";
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

  const install = useCallback(async (apkUrl: string) => {
    setState({ phase: "downloading", percent: 0 });
    try {
      await downloadAndInstall(apkUrl, (percent) => setState({ phase: "downloading", percent }));
      setState({ phase: "idle" });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Install failed",
      });
    }
  }, []);

  return { ...state, install, canInstallInApp: canInstallInApp() };
};
