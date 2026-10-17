/** Linux uses the existing notification planner with desktop ports, never Android plugins. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedLesson } from "@/lib/edupage";

const desktop = vi.hoisted(() => ({
  permission: vi.fn(),
  ensurePermission: vi.fn(),
  notify: vi.fn(),
  schedule: vi.fn(),
}));
vi.mock("@/lib/desktop", () => ({
  isDesktop: () => true,
  hasDesktopNotificationPermission: desktop.permission,
  ensureDesktopNotificationPermission: desktop.ensurePermission,
  notifyDesktop: desktop.notify,
  scheduleDesktopReminders: desktop.schedule,
}));

import {
  ensureNotificationPermission,
  hasNotificationPermission,
  isNotificationPermissionDenied,
  notifyNewTimetable,
  notifySubstitutionsChanged,
  onNotificationTap,
  rescheduleLessonReminders,
} from "../localNotifications.ts";
import { isWebPushSupported } from "../webPush.ts";

beforeEach(() => vi.resetAllMocks());

describe("desktop notification routing", () => {
  it("uses the desktop permission ports and never advertises browser push", async () => {
    desktop.permission.mockResolvedValue(true);
    desktop.ensurePermission.mockResolvedValue(true);
    await expect(hasNotificationPermission()).resolves.toBe(true);
    await expect(ensureNotificationPermission()).resolves.toBe(true);
    await expect(isNotificationPermissionDenied()).resolves.toBe(false);
    expect(isWebPushSupported()).toBe(false);
    expect(() => onNotificationTap(vi.fn())()).not.toThrow();
  });

  it("sends change and new-week notifications to the desktop", async () => {
    await notifySubstitutionsChanged("Changed", "Room 24", "2026-10-15");
    await notifyNewTimetable("New week", "Monday", "2026-10-19");
    expect(desktop.notify.mock.calls).toEqual([
      ["Changed", "Room 24"],
      ["New week", "Monday"],
    ]);
  });

  it("keeps translated lesson reminders and clears them when disabled", async () => {
    const lesson: ResolvedLesson = {
      period: "1",
      start: "08:30",
      end: "09:10",
      span: 1,
      subject: { id: "math", name: "Mathematics", short: "Math", color: null },
      teachers: [],
      rooms: [{ id: "24", name: "24", short: "24" }],
      group: null,
      status: "normal",
      changeNote: null,
      original: null,
    };
    const at = new Date("2026-10-15T05:25:00Z");
    await rescheduleLessonReminders([{ id: 1, lesson, fireAt: at }], 5, "en");
    expect(desktop.schedule).toHaveBeenCalledWith([{ at, title: "Math in 5 min", body: "24" }]);
    await rescheduleLessonReminders([], 0, "en");
    expect(desktop.schedule).toHaveBeenLastCalledWith([]);
  });
});
