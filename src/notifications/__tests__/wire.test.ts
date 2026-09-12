import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "../../db/index.ts";
import { createSyncEngine } from "../../sync/index.ts";
import { createAppStore } from "../../store/useAppStore.ts";
import { rigaClock } from "../../lib/schedule/index.ts";

const rescheduleLessonReminders = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifySubstitutionsChanged = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifyAppUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const ensureNotificationPermission = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("../localNotifications.ts", () => ({
  rescheduleLessonReminders,
  notifySubstitutionsChanged,
  notifyAppUpdate,
  ensureNotificationPermission,
}));

const checkForUpdate = vi.hoisted(() => vi.fn());
vi.mock("../../lib/version/index.ts", () => ({ checkForUpdate }));

const { wireNotifications, notifyOnChanges, checkForAppUpdateNotification } =
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
  ensureNotificationPermission.mockClear();
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
