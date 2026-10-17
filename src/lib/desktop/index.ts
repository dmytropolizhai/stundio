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

/** A stalled response must still settle: boot.ts shares one in-flight refresh for all callers. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * `fetch` through the shell's native HTTP, which is not subject to CORS. Restricted to the
 * school's HTTPS origin by the shell capability, so no web proxy is required. The body is read
 * inside the timeout too: a connection that stalls mid-response is the case it exists for.
 */
export const desktopFetch = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("EduPage did not respond", "TimeoutError"));
  }, REQUEST_TIMEOUT_MS);
  try {
    const response = await nativeFetch(url, {
      ...init,
      connectTimeout: 15_000,
      signal: controller.signal,
    });
    return new Response(await response.text(), { status: response.status });
  } finally {
    clearTimeout(timer);
  }
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

/*
 * Linux reports notification permission as always granted, so the only sign that nothing is
 * shown (no portal backend and no daemon, e.g. a bare Hyprland setup) is the send failing.
 * Settings reads this to say so instead of leaving the toggles looking like they work.
 */
let lastNotificationFailed = false;

export const desktopNotificationsFailing = (): boolean => lastNotificationFailed;

export const notifyDesktop = async (title: string, body: string): Promise<void> => {
  if (!(await hasDesktopNotificationPermission())) return;
  try {
    await invoke("notify_desktop", { title, body });
    lastNotificationFailed = false;
  } catch (error) {
    lastNotificationFailed = true;
    throw error;
  }
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

/** Calls `listener` whenever the window gains focus — the desktop's "app became active". */
export const onDesktopFocus = (listener: () => void): (() => void) => {
  const handle = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) listener();
  });
  return () => {
    void handle.then((unlisten) => unlisten());
  };
};
