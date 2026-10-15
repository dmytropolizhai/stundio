/**
 * Linux desktop ports. Tauri stays behind this boundary so the timetable engine and the
 * existing Android/web builds remain portable. The shell supplies only OS integration;
 * IndexedDB and all schedule calculations still belong to the existing application.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { fetch as nativeFetch } from "@tauri-apps/plugin-http";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";

export const isDesktop = (): boolean => isTauri();

/** Restricted to the school's HTTPS origin by the shell capability. No web proxy required. */
export const desktopPost = async (
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<{ status: number; text: string }> => {
  const response = await nativeFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    connectTimeout: 15_000,
  });
  return { status: response.status, text: await response.text() };
};

/** The file chooser grants access to the selected file; no home-directory access is needed. */
export const saveDesktopImage = async (base64: string, fileName: string): Promise<void> => {
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: "PNG", extensions: ["png"] }],
  });
  if (path === null) throw new DOMException("Save cancelled", "AbortError");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  await writeFile(path, bytes);
};

export const hasDesktopNotificationPermission = (): Promise<boolean> => isPermissionGranted();

export const ensureDesktopNotificationPermission = async (): Promise<boolean> =>
  (await isPermissionGranted()) || (await requestPermission()) === "granted";

export const notifyDesktop = async (title: string, body: string): Promise<void> => {
  if (await hasDesktopNotificationPermission()) await invoke("notify_desktop", { title, body });
};

const reminderTimers = new Set<ReturnType<typeof setTimeout>>();

export const clearDesktopReminders = (): void => {
  for (const timer of reminderTimers) clearTimeout(timer);
  reminderTimers.clear();
};

/** Timers work while the process runs. Drop stale reminders after laptop suspend. */
export const scheduleDesktopReminders = (
  reminders: readonly { at: Date; title: string; body: string }[],
): void => {
  clearDesktopReminders();
  for (const reminder of reminders) {
    const delay = reminder.at.getTime() - Date.now();
    if (delay <= 0 || delay > 2_147_483_647) continue;
    const timer = setTimeout(() => {
      reminderTimers.delete(timer);
      if (Date.now() - reminder.at.getTime() < 60_000) {
        void notifyDesktop(reminder.title, reminder.body).catch(() => {});
      }
    }, delay);
    reminderTimers.add(timer);
  }
};

/** Refresh when returning to the window, using the same throttle as mobile resume. */
export const watchDesktopResume = (
  refresh: () => void | Promise<void>,
  now: () => number = Date.now,
  throttleMs = 60_000,
): (() => void) => {
  let disposed = false;
  let lastRun = now();
  const handle = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (disposed || !focused || now() - lastRun < throttleMs) return;
    lastRun = now();
    void refresh();
  });
  return () => {
    disposed = true;
    void handle.then((unlisten) => unlisten());
  };
};
