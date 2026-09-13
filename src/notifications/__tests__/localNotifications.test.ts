/**
 * Mirrors `sync/__tests__/lifecycle.test.ts`'s pattern for a Capacitor plugin: mock the
 * plugin module, assert on how this file calls it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedLesson } from "../../lib/edupage/index.ts";

const schedule = vi.hoisted(() => vi.fn());
const cancel = vi.hoisted(() => vi.fn());
const getPending = vi.hoisted(() => vi.fn());
const createChannel = vi.hoisted(() => vi.fn());
const checkPermissions = vi.hoisted(() => vi.fn());
const requestPermissions = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const addListener = vi.hoisted(() => vi.fn().mockResolvedValue({ remove }));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    schedule,
    cancel,
    getPending,
    createChannel,
    checkPermissions,
    requestPermissions,
    addListener,
  },
}));

const {
  ensureNotificationPermission,
  hasNotificationPermission,
  notifyAppUpdate,
  notifySubstitutionsChanged,
  onNotificationTap,
  rescheduleLessonReminders,
} = await import("../localNotifications.ts");

const lesson = (over: Partial<ResolvedLesson> = {}): ResolvedLesson => ({
  period: "1",
  start: "08:30",
  end: "09:10",
  span: 1,
  subject: { id: "s1", name: "Matemātika", short: "Mat", color: null },
  teachers: [{ id: "t1", name: "Kalniņš J.", short: "Kalniņš J.", color: null }],
  rooms: [{ id: "r1", name: "101", short: "101" }],
  group: null,
  status: "normal",
  changeNote: null,
  original: null,
  ...over,
});

beforeEach(() => {
  schedule.mockReset();
  cancel.mockReset();
  getPending.mockReset().mockResolvedValue({ notifications: [] });
  createChannel.mockReset();
  checkPermissions.mockReset();
  requestPermissions.mockReset();
  addListener.mockClear().mockResolvedValue({ remove });
  remove.mockClear();
});

describe("ensureNotificationPermission", () => {
  it("does not prompt again once already granted", async () => {
    checkPermissions.mockResolvedValue({ display: "granted" });
    expect(await ensureNotificationPermission()).toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("does not prompt again once already denied", async () => {
    checkPermissions.mockResolvedValue({ display: "denied" });
    expect(await ensureNotificationPermission()).toBe(false);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("asks when undetermined", async () => {
    checkPermissions.mockResolvedValue({ display: "prompt" });
    requestPermissions.mockResolvedValue({ display: "granted" });
    expect(await ensureNotificationPermission()).toBe(true);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });
});

describe("hasNotificationPermission", () => {
  it("reports granted without ever calling requestPermissions", async () => {
    checkPermissions.mockResolvedValue({ display: "granted" });
    expect(await hasNotificationPermission()).toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("reports not granted when undetermined, without prompting", async () => {
    checkPermissions.mockResolvedValue({ display: "prompt" });
    expect(await hasNotificationPermission()).toBe(false);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("reports not granted when denied", async () => {
    checkPermissions.mockResolvedValue({ display: "denied" });
    expect(await hasNotificationPermission()).toBe(false);
    expect(requestPermissions).not.toHaveBeenCalled();
  });
});

describe("rescheduleLessonReminders", () => {
  it("cancels nothing and schedules nothing for an empty list", async () => {
    await rescheduleLessonReminders([], 10, "lv");
    expect(cancel).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("cancels every previously-scheduled reminder before scheduling the new ones", async () => {
    getPending.mockResolvedValue({ notifications: [{ id: 1200 }, { id: 1 }, { id: 2 }] });
    await rescheduleLessonReminders(
      [{ id: 42, lesson: lesson(), fireAt: new Date("2026-09-09T05:20:00Z") }],
      10,
      "lv",
    );
    // Only the id in the lesson-reminder band (1000+) is cancelled — ids 1/2 belong to the
    // "changed"/"update" one-shots and must survive.
    expect(cancel).toHaveBeenCalledWith({ notifications: [{ id: 1200 }] });
    expect(schedule).toHaveBeenCalledTimes(1);
    const [[options]] = schedule.mock.calls as [[{ notifications: { id: number }[] }]];
    expect(options.notifications[0]?.id).toBe(1042);
  });
});

describe("one-shot notifications", () => {
  it("notifySubstitutionsChanged schedules a single fixed-id notification", async () => {
    await notifySubstitutionsChanged("title", "body", "2026-09-09");
    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 1,
          title: "title",
          body: "body",
          channelId: "schedule",
          extra: { kind: "substitutionsChanged", date: "2026-09-09" },
        },
      ],
    });
  });

  it("notifyAppUpdate schedules a single fixed-id notification", async () => {
    await notifyAppUpdate("title", "body");
    expect(schedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 2,
          title: "title",
          body: "body",
          channelId: "schedule",
          extra: { kind: "appUpdate" },
        },
      ],
    });
  });
});

describe("onNotificationTap", () => {
  it("invokes the handler with the tapped notification's extra payload", () => {
    const handler = vi.fn();
    onNotificationTap(handler);

    expect(addListener).toHaveBeenCalledWith("localNotificationActionPerformed", expect.any(Function));
    const [, listener] = addListener.mock.calls[0] as [string, (action: unknown) => void];
    listener({ notification: { extra: { kind: "appUpdate" } } });

    expect(handler).toHaveBeenCalledWith({ kind: "appUpdate" });
  });

  it("ignores a tap on a notification with no extra payload", () => {
    const handler = vi.fn();
    onNotificationTap(handler);

    const [, listener] = addListener.mock.calls[0] as [string, (action: unknown) => void];
    listener({ notification: {} });

    expect(handler).not.toHaveBeenCalled();
  });

  it("removes the underlying listener once unsubscribed", async () => {
    const dispose = onNotificationTap(vi.fn());
    dispose();
    await Promise.resolve();

    expect(remove).toHaveBeenCalled();
  });
});
