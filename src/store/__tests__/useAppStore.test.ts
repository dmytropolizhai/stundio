/**
 * Phase 2 exit criterion, tested directly: airplane mode → the app opens to the last-known
 * timetable instantly; going online refreshes it and exposes a "last updated" timestamp.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "../../db/index.ts";
import { createSyncEngine, nextSchoolDay, todayInRiga } from "../../sync/index.ts";
import { createAppStore } from "../useAppStore.ts";
import type { AnalyticsClient } from "../../lib/analytics/index.ts";

const DATE = "2026-09-09";
const now = () => new Date(`${DATE}T08:00:00Z`);

let server: FakeServer;
let cache: AppCache;

const makeStore = (clock: () => Date = now, analytics?: AnalyticsClient) =>
  createAppStore({
    cache,
    engine: createSyncEngine({ http: server.http, cache, now: clock }),
    ...(analytics === undefined ? {} : { analytics }),
  });

/** A1-2 is the class with real changes on 2026-09-09. */
const classIdOf = (store: ReturnType<typeof makeStore>, short: string): string => {
  const timetables = Object.values(store.getState().timetables);
  const found = timetables[0]?.classes.find((c) => c.short === short);
  return found?.id ?? "";
};

beforeEach(() => {
  server = createFakeServer();
  cache = createMemoryCache();
});

describe("hydrate", () => {
  it("starts empty and not ready", () => {
    const store = makeStore();
    expect(store.getState().ready).toBe(false);
    expect(store.getState().resolvedDay(DATE)).toBeNull();
  });

  it("becomes ready with defaults when the cache is empty", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().settings.selectedClassId).toBeNull();
    expect(store.getState().metas).toEqual([]);
  });
});

describe("refresh", () => {
  it("fills the store and records when it synced", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });

    const state = store.getState();
    expect(state.syncStatus).toBe("idle");
    expect(state.lastSyncAt).toBe("2026-09-09T08:00:00.000Z");
    expect(state.metas).toHaveLength(4);
    // Both buildings' weeks: automatic mode merges them into one day (MODEL.md §3).
    expect(Object.keys(state.timetables)).toEqual(["1174", "1175"]);
    expect(state.substitutions[DATE]?.items).toHaveLength(55);
  });

  it("resolves the selected class's day after a refresh", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));

    const day = store.getState().resolvedDay(DATE);
    expect(day).not.toBeNull();
    expect(day?.lessons.length).toBeGreaterThan(0);
    expect(day?.lessons.some((l) => l.status !== "normal")).toBe(true);
    expect(day?.stale).toBe(false);
  });

  it("returns null when no class is chosen yet", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    expect(store.getState().resolvedDay(DATE)).toBeNull();
  });
});

describe("offline cold open — the Phase 2 exit criterion", () => {
  it("serves the last-known timetable with no network", async () => {
    // Session 1: online, everything cached.
    const online = makeStore();
    await online.getState().refresh({ date: DATE });
    await online.getState().setClass(classIdOf(online, "A1-2"));
    const before = online.getState().resolvedDay(DATE);

    // Session 2: cold start, airplane mode. Same cache, dead network.
    server.reset();
    server.offline = true;
    const offline = makeStore();
    await offline.getState().hydrate();

    const after = offline.getState().resolvedDay(DATE);
    expect(after).toEqual(before);
    expect(server.calls.list).toBe(0); // hydrate must not touch the network
    expect(offline.getState().ready).toBe(true);
  });

  it("keeps the previous lastSyncAt when a refresh fails", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const stamp = store.getState().lastSyncAt;

    server.offline = true;
    await store.getState().refresh({ date: DATE });

    expect(store.getState().syncStatus).toBe("offline");
    expect(store.getState().lastSyncAt).toBe(stamp); // "updated 2m ago", not "never"
    expect(store.getState().lastError).not.toBeNull();
  });

  it("still resolves the day while offline", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));

    server.offline = true;
    await store.getState().refresh({ date: DATE });
    expect(store.getState().resolvedDay(DATE)?.lessons.length).toBeGreaterThan(0);
  });
});

/**
 * Regression: `readCache` used to load only a fixed window of days around the *wall clock's*
 * today, so any cached day outside it was dropped on the floor — the week view would render
 * a cancelled lesson as if it were going ahead. The store must expose every day the cache
 * holds, whatever the device clock says.
 */
describe("cached days the wall clock does not cover", () => {
  const datesFor = (clock: () => Date): string[] => [
    todayInRiga(clock()),
    nextSchoolDay(todayInRiga(clock())),
  ];

  // Whichever way the wall clock sits relative to these, at least one is far outside any
  // window centred on "now" — so this cannot pass by coincidence of the day it is run.
  const clocks: [label: string, clock: () => Date][] = [
    ["long past", () => new Date("2025-10-15T08:00:00Z")],
    ["far future", () => new Date("2027-04-14T08:00:00Z")],
  ];

  it.each(clocks)("exposes every cached day (%s)", async (_label, clock) => {
    const store = makeStore(clock);
    await store.getState().refresh();

    expect(Object.keys(store.getState().substitutions).sort()).toEqual(datesFor(clock).sort());
    for (const d of datesFor(clock)) {
      expect(store.getState().substitutions[d]?.items).toHaveLength(55);
    }
  });

  it.each(clocks)("keeps cancelled lessons visible on a cold open (%s)", async (_label, clock) => {
    const seed = makeStore(clock);
    await seed.getState().refresh();
    await seed.getState().setClass(classIdOf(seed, "A1-2"));

    // Cold start against the same cache, no network at all.
    server.reset();
    server.offline = true;
    const cold = makeStore(clock);
    await cold.getState().hydrate();

    const date = todayInRiga(clock());
    const day = cold.getState().resolvedDay(date);
    expect(day?.lessons.length).toBeGreaterThan(0);
    expect(day?.lessons.some((l) => l.status !== "normal")).toBe(true);
  });
});

describe("settings", () => {
  it("persists the selected class across a restart", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const id = classIdOf(store, "A1-2");
    await store.getState().setClass(id);

    const restarted = makeStore();
    await restarted.getState().hydrate();
    expect(restarted.getState().settings.selectedClassId).toBe(id);
  });

  it("toggles favourites on and off", async () => {
    const store = makeStore();
    await store.getState().hydrate();

    await store.getState().toggleFavorite("-927");
    expect(store.getState().settings.favorites).toEqual(["-927"]);
    await store.getState().toggleFavorite("-928");
    expect(store.getState().settings.favorites).toEqual(["-927", "-928"]);
    await store.getState().toggleFavorite("-927");
    expect(store.getState().settings.favorites).toEqual(["-928"]);
  });

  it("persists theme and language", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setTheme("dark");
    await store.getState().setLang("ru");

    expect(await cache.getSettings()).toMatchObject({ theme: "dark", lang: "ru" });
  });

  it("re-resolves against the pinned building", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));

    // Automatic: the main building leads, and the merge holds no duplicate of a lesson the
    // (fixture-identical) TIC week repeats.
    const auto = store.getState().resolvedDay(DATE);
    expect(auto?.building).toBe("Galvenā ēka");
    expect(auto?.ttNum).toBe("1175");

    await store.getState().setBuilding("TIC");
    const tic = store.getState().resolvedDay(DATE);
    expect(tic?.building).toBe("TIC");
    expect(tic?.ttNum).toBe("1174");
    expect(tic?.lessons).toHaveLength(auto?.lessons.length ?? -1);
  });
});

describe("analytics", () => {
  it("tracks through the injected client when enabled (the default)", async () => {
    const analytics: AnalyticsClient = { track: vi.fn() };
    const store = makeStore(now, analytics);
    await store.getState().hydrate();

    store.getState().trackEvent("view_day");
    expect(analytics.track).toHaveBeenCalledWith("view_day");
  });

  it("stays silent once the user opts out", async () => {
    const analytics: AnalyticsClient = { track: vi.fn() };
    const store = makeStore(now, analytics);
    await store.getState().hydrate();
    await store.getState().setAnalyticsEnabled(false);

    store.getState().trackEvent("view_day");
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it("tracks a forced refresh but not a routine one", async () => {
    const analytics: AnalyticsClient = { track: vi.fn() };
    const store = makeStore(now, analytics);
    await store.getState().hydrate();

    await store.getState().refresh({ date: DATE });
    expect(analytics.track).not.toHaveBeenCalled();

    await store.getState().refresh({ date: DATE, force: true });
    expect(analytics.track).toHaveBeenCalledWith("manual_refresh");
  });
});

describe("resolvedDay memoisation", () => {
  it("returns the identical object for repeated reads", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));

    const first = store.getState().resolvedDay(DATE);
    const second = store.getState().resolvedDay(DATE);
    expect(second).toBe(first); // same reference — no re-merge, no re-render
  });

  it("invalidates when the class changes", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));
    const a = store.getState().resolvedDay(DATE);

    await store.getState().setClass(classIdOf(store, "A2-1"));
    const b = store.getState().resolvedDay(DATE);
    expect(b).not.toBe(a);
    expect(b?.classId).not.toBe(a?.classId);
  });

  it("accepts an explicit class id without changing the selection", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const id = classIdOf(store, "A1-2");

    const day = store.getState().resolvedDay(DATE, id);
    expect(day?.classId).toBe(id);
    expect(store.getState().settings.selectedClassId).toBeNull();
  });
});
