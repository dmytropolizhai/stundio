/**
 * Phase 2 exit criterion, tested directly: airplane mode → the app opens to the last-known
 * timetable instantly; going online refreshes it and exposes a "last updated" timestamp.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "../../db/index.ts";
import { createSyncEngine } from "../../sync/index.ts";
import { createAppStore } from "../useAppStore.ts";

const DATE = "2026-09-09";
const now = () => new Date(`${DATE}T08:00:00Z`);

let server: FakeServer;
let cache: AppCache;

const makeStore = () =>
  createAppStore({
    cache,
    engine: createSyncEngine({ http: server.http, cache, now }),
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
    expect(Object.keys(state.timetables)).toEqual(["1175"]);
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

  it("re-resolves after the building changes", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));
    expect(store.getState().resolvedDay(DATE)).not.toBeNull();

    // TIC's week (1174) was never fetched, so there is nothing to resolve against.
    await store.getState().setBuilding("TIC");
    expect(store.getState().resolvedDay(DATE)).toBeNull();
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
