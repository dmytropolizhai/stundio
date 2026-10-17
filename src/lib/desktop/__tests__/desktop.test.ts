import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ports = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  fetch: vi.fn(),
  save: vi.fn(),
  writeFile: vi.fn(),
  permission: vi.fn(),
  request: vi.fn(),
  notify: vi.fn(),
  focus: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ isTauri: ports.isTauri, invoke: ports.notify }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onFocusChanged: ports.focus }),
}));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: ports.fetch }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: ports.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: ports.writeFile }));
vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: ports.permission,
  requestPermission: ports.request,
}));

import {
  clearDesktopReminders,
  desktopNotificationsFailing,
  desktopFetch,
  ensureDesktopNotificationPermission,
  notifyDesktop,
  saveDesktopImage,
  scheduleDesktopReminders,
  onDesktopFocus,
} from "../index.ts";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T07:00:00Z"));
  ports.permission.mockResolvedValue(true);
});

afterEach(() => {
  clearDesktopReminders();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("Linux desktop integration", () => {
  it("fetches through native HTTP and preserves server errors for the existing parser", async () => {
    ports.fetch.mockResolvedValue(new Response("school unavailable", { status: 503 }));
    const init = { method: "POST", headers: { Referer: "school" }, body: '{"year":2026}' };
    const response = await desktopFetch("https://pikcrvt.edupage.org/test", init);
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("school unavailable");
    expect(ports.fetch).toHaveBeenCalledWith("https://pikcrvt.edupage.org/test", {
      ...init,
      connectTimeout: 15_000,
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it("aborts a response that stalls after connecting", async () => {
    ports.fetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(init.signal.reason as Error));
        }),
    );
    const request = desktopFetch("https://pikcrvt.edupage.org/test", { method: "POST" });
    const settled = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(30_000);
    await settled;
  });

  it("writes only the file selected in the chooser", async () => {
    ports.save.mockResolvedValue("/selected/week.png");
    await saveDesktopImage(btoa("PNG"), "week.png");
    expect(ports.writeFile).toHaveBeenCalledWith(
      "/selected/week.png",
      new Uint8Array([80, 78, 71]),
    );
  });

  it("treats chooser cancellation as cancellation and writes nothing", async () => {
    ports.save.mockResolvedValue(null);
    await expect(saveDesktopImage("", "week.png")).rejects.toMatchObject({ name: "AbortError" });
    expect(ports.writeFile).not.toHaveBeenCalled();
  });

  it("never prompts when checking or delivering a notification", async () => {
    ports.permission.mockResolvedValue(false);
    await notifyDesktop("Lesson", "Room 12");
    expect(ports.request).not.toHaveBeenCalled();
    expect(ports.notify).not.toHaveBeenCalled();
    ports.request.mockResolvedValue("granted");
    await expect(ensureDesktopNotificationPermission()).resolves.toBe(true);
    expect(ports.request).toHaveBeenCalledOnce();
  });

  it("remembers a failed send so Settings can say notifications are not shown", async () => {
    ports.notify.mockRejectedValueOnce(new Error("portal: no backend; daemon: no owner"));
    await expect(notifyDesktop("Lesson", "Room 12")).rejects.toThrow("no owner");
    expect(desktopNotificationsFailing()).toBe(true);
    ports.notify.mockResolvedValueOnce(undefined);
    await notifyDesktop("Lesson", "Room 12");
    expect(desktopNotificationsFailing()).toBe(false);
  });

  it("replaces reminders so changed or disabled schedules cannot fire stale notifications", async () => {
    const at = new Date(Date.now() + 1000);
    scheduleDesktopReminders([{ at, title: "Old room", body: "12" }]);
    scheduleDesktopReminders([{ at, title: "New room", body: "24" }]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(ports.notify).toHaveBeenCalledExactlyOnceWith("notify_desktop", {
      title: "New room",
      body: "24",
    });
    ports.notify.mockClear();
    scheduleDesktopReminders([{ at: new Date(Date.now() + 1000), title: "Cancelled", body: "" }]);
    clearDesktopReminders();
    await vi.advanceTimersByTimeAsync(1000);
    expect(ports.notify).not.toHaveBeenCalled();
  });

  it("does not deliver an old reminder after the computer wakes from sleep", async () => {
    scheduleDesktopReminders([{ at: new Date(Date.now() + 1000), title: "Expired", body: "" }]);
    vi.setSystemTime(new Date(Date.now() + 300_000));
    await vi.advanceTimersByTimeAsync(1000);
    expect(ports.notify).not.toHaveBeenCalled();
  });

  it("reports only gained focus and disposes the focus listener", async () => {
    const unlisten = vi.fn();
    ports.focus.mockResolvedValue(unlisten);
    const active = vi.fn();
    const dispose = onDesktopFocus(active);
    const listener = ports.focus.mock.calls[0]?.[0] as (event: { payload: boolean }) => void;
    listener({ payload: false });
    expect(active).not.toHaveBeenCalled();
    listener({ payload: true });
    expect(active).toHaveBeenCalledOnce();
    dispose();
    await Promise.resolve();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
