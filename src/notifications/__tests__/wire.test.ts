import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "@/db";
import { createSyncEngine } from "@/sync";
import { createAppStore } from "../../store/useAppStore.ts";
import { rigaClock } from "@/lib/schedule";

const rescheduleLessonReminders = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifySubstitutionsChanged = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifyAppUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const hasNotificationPermission = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const tapHandlers = vi.hoisted(() => [] as ((extra: unknown) => void)[]);
const onNotificationTap = vi.hoisted(() =>
  vi.fn((handler: (extra: unknown) => void) => {
    tapHandlers.push(handler);
    return vi.fn();
  }),
);

vi.mock("../localNotifications.ts", () => ({
  rescheduleLessonReminders,
  notifySubstitutionsChanged,
  notifyAppUpdate,
  hasNotificationPermission,
  onNotificationTap,
}));

const checkForUpdate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/version", () => ({ checkForUpdate }));

const { wireNotifications, wireNotificationTaps, notifyOnChanges, checkForAppUpdateNotification } =
  await import("../wire.ts");

const DATE = "2026-09-09";

let server: FakeServer;
let cache: AppCache;

const makeStore = () =>
  createAppStore({
    cache,
    engine: createSyncEngine({
      http: server.http,
      cache,
      now: () => new Date(`${DATE}T08:00:00Z`),
    }),
  });

const classIdOf = (store: ReturnType<typeof makeStore>): string =>
  Object.values(store.getState().timetables)[0]?.classes[0]?.id ?? "";

beforeEach(() => {
  server = createFakeServer();
  cache = createMemoryCache();
  rescheduleLessonReminders.mockClear();
  notifySubstitutionsChanged.mockClear();
  notifyAppUpdate.mockClear();
  hasNotificationPermission.mockClear();
  onNotificationTap.mockClear();
  tapHandlers.length = 0;
  checkForUpdate.mockReset();
});

describe("wireNotifications", () => {
  it("reschedules lesson reminders once the store becomes ready with a selected class", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store));

    const { dispose } = wireNotifications(store);
    // The permission check + initial sync run async; flush both.
    await Promise.resolve();
    await Promise.resolve();

    expect(rescheduleLessonReminders).toHaveBeenCalled();
    dispose();
  });

  it("does not touch the plugin before the store is ready", () => {
    const store = makeStore();
    const { dispose } = wireNotifications(store);
    expect(rescheduleLessonReminders).not.toHaveBeenCalled();
    dispose();
  });
});

describe("notifyOnChanges", () => {
  // `notifyOnChanges` reads the real wall clock for "today" (it runs off a live sync, not a
  // fixture date), so these dates are relative to whenever the test happens to run.
  const today = rigaClock().date;
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  it("stays quiet on the very first sync, even if today changed", () => {
    const store = makeStore();
    notifyOnChanges(store, { changedDates: [today] } as never, false);
    expect(notifySubstitutionsChanged).not.toHaveBeenCalled();
  });

  it("notifies when today is in the changed set on a later sync", () => {
    const store = makeStore();
    notifyOnChanges(store, { changedDates: [today] } as never, true);
    expect(notifySubstitutionsChanged).toHaveBeenCalledTimes(1);
    expect(notifySubstitutionsChanged).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      today,
    );
  });

  it("targets the nearest future changed date when today itself didn't change", () => {
    const store = makeStore();
    const laterDate = new Date(new Date(`${today}T12:00:00Z`).getTime() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const evenLaterDate = new Date(new Date(`${today}T12:00:00Z`).getTime() + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    notifyOnChanges(store, { changedDates: [evenLaterDate, laterDate] } as never, true);
    expect(notifySubstitutionsChanged).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      laterDate,
    );
  });

  it("stays quiet when nothing on or after today changed", () => {
    const store = makeStore();
    notifyOnChanges(store, { changedDates: [yesterday] } as never, true);
    expect(notifySubstitutionsChanged).not.toHaveBeenCalled();
  });

  it("respects the notifySubstitutionChanges setting", async () => {
    const store = makeStore();
    await store.getState().setNotifySubstitutionChanges(false);
    notifyOnChanges(store, { changedDates: [today] } as never, true);
    expect(notifySubstitutionsChanged).not.toHaveBeenCalled();
  });
});

describe("checkForAppUpdateNotification", () => {
  it("notifies once for a new release and remembers the version", async () => {
    const store = makeStore();
    checkForUpdate.mockResolvedValue({
      hasUpdate: true,
      currentVersion: "v0.0.1",
      latestVersion: "v0.0.2",
      url: "https://example.test",
    });

    await checkForAppUpdateNotification(store);
    expect(notifyAppUpdate).toHaveBeenCalledTimes(1);
    expect(store.getState().settings.lastNotifiedUpdateVersion).toBe("v0.0.2");

    await checkForAppUpdateNotification(store);
    expect(notifyAppUpdate).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when there is no update", async () => {
    const store = makeStore();
    checkForUpdate.mockResolvedValue(null);
    await checkForAppUpdateNotification(store);
    expect(notifyAppUpdate).not.toHaveBeenCalled();
  });

  it("respects the notifyAppUpdates setting", async () => {
    const store = makeStore();
    await store.getState().setNotifyAppUpdates(false);
    checkForUpdate.mockResolvedValue({
      hasUpdate: true,
      currentVersion: "v0.0.1",
      latestVersion: "v0.0.2",
      url: "https://example.test",
    });
    await checkForAppUpdateNotification(store);
    expect(notifyAppUpdate).not.toHaveBeenCalled();
  });
});

describe("wireNotificationTaps", () => {
  it("routes a lesson-reminder tap to the day tab on the lesson's date", () => {
    const store = makeStore();
    wireNotificationTaps(store);
    tapHandlers[0]?.({ kind: "lesson", date: "2026-09-09" });
    expect(store.getState().pendingNavigation).toEqual({ tab: "day", date: "2026-09-09" });
  });

  it("routes a substitutions-changed tap to the changes tab on the changed date", () => {
    const store = makeStore();
    wireNotificationTaps(store);
    tapHandlers[0]?.({ kind: "substitutionsChanged", date: "2026-09-10" });
    expect(store.getState().pendingNavigation).toEqual({ tab: "changes", date: "2026-09-10" });
  });

  it("routes an app-update tap to the settings tab", () => {
    const store = makeStore();
    wireNotificationTaps(store);
    tapHandlers[0]?.({ kind: "appUpdate" });
    expect(store.getState().pendingNavigation).toEqual({ tab: "settings" });
  });
});
