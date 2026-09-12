import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Native side of "update without leaving the app": downloads the release APK to the
 * app's cache dir and hands it to the OS package installer. Backed by the `ApkInstaller`
 * Capacitor plugin in `android/app/src/main/java/site/polizhai/rvtstunda/`
 * (`ApkInstallerPlugin.java`) — there is no web/JS fallback because this is Android-only,
 * on-device behaviour by nature.
 */
export type ApkDownloadProgress = { percent: number };

export type ApkInstallerPlugin = {
  download(options: { url: string }): Promise<{ path: string }>;
  install(options: { path: string }): Promise<void>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (data: ApkDownloadProgress) => void,
  ): Promise<{ remove: () => Promise<void> }>;
};

const ApkInstaller = registerPlugin<ApkInstallerPlugin>("ApkInstaller");

/** The in-app install flow only exists on Android; everywhere else, fall back to the browser link. */
export const canInstallInApp = (): boolean => Capacitor.getPlatform() === "android";

/**
 * Downloads `apkUrl` and opens the Android install prompt for it. Resolves once the
 * install intent has been handed off — actually installing still needs the user's tap,
 * since that confirmation is an OS-level gate this app cannot (and shouldn't) skip.
 */
export const downloadAndInstall = async (
  apkUrl: string,
  onProgress: (percent: number) => void,
): Promise<void> => {
  const subscription = await ApkInstaller.addListener("downloadProgress", ({ percent }) => {
    onProgress(percent);
  });
  try {
    const { path } = await ApkInstaller.download({ url: apkUrl });
    await ApkInstaller.install({ path });
  } finally {
    await subscription.remove();
  }
};
