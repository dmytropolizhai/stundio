/**
 * Phase 2 exit criterion, tested directly: airplane mode → the app opens to the last-known
 * timetable instantly; going online refreshes it and exposes a "last updated" timestamp.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "@/db";
import { createSyncEngine, nextSchoolDay, todayInRiga } from "@/sync";
import { createAppStore } from "../useAppStore.ts";
import type { AnalyticsClient } from "@/lib/analytics";

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

/**
 * Real device connectivity (`watchConnectivity`, wired in `boot.ts`) folds into the same
 * `syncStatus` a failed fetch already produces — not a second, parallel notion of offline.
 */
describe("setConnectivity", () => {
  it("goes offline immediately, without waiting for a fetch to fail", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    expect(store.getState().syncStatus).toBe("idle");

    store.getState().setConnectivity(false);

    expect(store.getState().syncStatus).toBe("offline");
    // No network call was made to reach that conclusion — the device said so directly.
    expect(server.calls.list).toBe(1);
  });

  it("triggers a refresh on reconnection, which settles the real status", async () => {
    const store = makeStore();
    server.offline = true;
    store.getState().setConnectivity(false);
    expect(store.getState().syncStatus).toBe("offline");

    server.offline = false;
    store.getState().setConnectivity(true);
    await vi.waitFor(() => {
      expect(store.getState().syncStatus).toBe("idle");
    });
  });

  it("a reconnect that still can't reach the school stays offline", async () => {
    const store = makeStore();
    server.offline = true;

    store.getState().setConnectivity(true);
    await vi.waitFor(() => {
      expect(store.getState().syncStatus).toBe("offline");
    });
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

  it("persists the app accent and the colour-coding toggle", async () => {
    const store = makeStore();
    await store.getState().hydrate();

    expect(store.getState().settings.appAccent).toBe("default");
    expect(store.getState().settings.subjectColorCodingEnabled).toBe(true);

    await store.getState().setAppAccent("lilac");
    await store.getState().setSubjectColorCodingEnabled(false);

    expect(store.getState().settings.appAccent).toBe("lilac");
    expect(store.getState().settings.subjectColorCodingEnabled).toBe(false);
    expect(await cache.getSettings()).toMatchObject({
      appAccent: "lilac",
      subjectColorCodingEnabled: false,
    });
  });

  it("restores the accent, colour-coding and every other Customization setting on reset", async () => {
    const store = makeStore();
    await store.getState().hydrate();

    await store.getState().setAppAccent("mint");
    await store.getState().setSubjectColorCodingEnabled(false);
    await store.getState().setSubjectColorOverride("prg", "lime");
    await store.getState().setReduceMotion(true);

    await store.getState().resetCustomization();

    expect(store.getState().settings.appAccent).toBe("default");
    expect(store.getState().settings.subjectColorCodingEnabled).toBe(true);
    expect(store.getState().settings.subjectColorOverrides).toEqual({});
    expect(store.getState().settings.reduceMotion).toBe(false);
  });

  it("clears user data (settings and notes) on resetAllData while preserving timetables", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const classId = classIdOf(store, "A1-2");
    await store.getState().setClass(classId);
    await store.getState().setLang("en");
    await store.getState().setTheme("dark");
    await store.getState().setNote("Matemātika", "Piezīme");

    expect(store.getState().settings.selectedClassId).toBe(classId);
    expect(store.getState().settings.lang).toBe("en");
    expect(Object.keys(store.getState().timetables).length).toBeGreaterThan(0);
    expect(Object.keys(store.getState().notes).length).toBeGreaterThan(0);

    await store.getState().resetAllData();

    expect(store.getState().settings.selectedClassId).toBeNull();
    expect(store.getState().settings.lang).toBe("lv");
    expect(store.getState().settings.theme).toBe("system");
    expect(store.getState().notes).toEqual({});
    expect(await cache.listNoteSubjects()).toEqual([]);
    // Timetables and metas are preserved so class picker works immediately
    expect(store.getState().metas.length).toBeGreaterThan(0);
    expect(Object.keys(store.getState().timetables).length).toBeGreaterThan(0);
    expect((await cache.listTimetableNums()).length).toBeGreaterThan(0);
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

describe("selectedClassShort", () => {
  it("is null before a class is picked", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    expect(store.getState().selectedClassShort()).toBeNull();
  });

  it("translates the stored EduPage id into the name the substitution feed uses", async () => {
    // Web Push subscriptions are filed under this, so an id here reaches nobody.
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));
    expect(store.getState().selectedClassShort()).toBe("A1-2");
  });

  it("is null while no timetable that knows the class is cached yet", () => {
    const store = makeStore();
    expect(store.getState().selectedClassShort()).toBeNull();
  });

  it("is null when persona is teacher even if a class was previously chosen", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "A1-2"));
    expect(store.getState().selectedClassShort()).toBe("A1-2");

    await store.getState().setPersona("teacher");
    expect(store.getState().selectedClassShort()).toBeNull();
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

  it("invalidates when the subgroup changes", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "DT3-2"));

    const merged = store.getState().resolvedDay(DATE);
    await store.getState().setSubgroup("1");
    const groupOne = store.getState().resolvedDay(DATE);

    expect(groupOne).not.toBe(merged);
    expect(groupOne?.lessons.length).toBeLessThan(merged?.lessons.length ?? 0);
  });
});

describe("setSubgroup", () => {
  it("persists and survives a restart", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "DT3-2"));
    await store.getState().setSubgroup("2");
    expect(store.getState().settings.subgroup).toBe("2");

    const restarted = makeStore();
    await restarted.getState().hydrate();
    expect(restarted.getState().settings.subgroup).toBe("2");
  });

  it("resets to null when the class changes", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    await store.getState().setClass(classIdOf(store, "DT3-2"));
    await store.getState().setSubgroup("1");

    await store.getState().setClass(classIdOf(store, "A1-2"));
    expect(store.getState().settings.subgroup).toBeNull();
  });
});

describe("persona and teacher mode", () => {
  const teacherIdOf = (store: ReturnType<typeof makeStore>, name: string): string => {
    const timetables = Object.values(store.getState().timetables);
    for (const t of timetables) {
      const found = t.teachers.find((tc) => tc.name === name || tc.short === name);
      if (found) return found.id;
    }
    return "";
  };

  it("defaults preserve student persona", () => {
    const store = makeStore();
    const settings = store.getState().settings;
    expect(settings.persona).toBe("student");
    expect(settings.selectedTeacherId).toBeNull();
    expect(settings.teacherView).toBe("own");
    expect(settings.highlightCoverLessons).toBe(true);
  });

  it("persists persona and teacher settings", async () => {
    const store = makeStore();
    await store.getState().setPersona("teacher");
    await store.getState().setTeacher("-403");
    await store.getState().setTeacherView("form-class");
    await store.getState().setHighlightCoverLessons(false);

    const s = store.getState().settings;
    expect(s.persona).toBe("teacher");
    expect(s.selectedTeacherId).toBe("-403");
    expect(s.teacherView).toBe("form-class");
    expect(s.highlightCoverLessons).toBe(false);

    // Switching teacher resets teacherView to "own"
    await store.getState().setTeacher("-230");
    expect(store.getState().settings.selectedTeacherId).toBe("-230");
    expect(store.getState().settings.teacherView).toBe("own");
  });

  it("routes resolvedDay to teacher schedule when persona is teacher", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const teacherId = teacherIdOf(store, "Alksne Santa");
    expect(teacherId).toBeTruthy();

    await store.getState().setPersona("teacher");
    await store.getState().setTeacher(teacherId);

    const day = store.getState().resolvedDay(DATE);
    expect(day).not.toBeNull();
    expect(day?.teacherId).toBe(teacherId);
    expect(day?.lessons.length).toBeGreaterThan(0);
  });

  it("switches between own lessons and form-class lessons based on teacherView", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const teacherId = teacherIdOf(store, "Alksne Santa");

    await store.getState().setPersona("teacher");
    await store.getState().setTeacher(teacherId);
    await store.getState().setTeacherView("own");

    const ownDay = store.getState().resolvedDay(DATE);
    expect(ownDay?.teacherId).toBe(teacherId);

    await store.getState().setTeacherView("form-class");
    const formDay = store.getState().resolvedDay(DATE);
    expect(formDay?.teacherId).toBeUndefined();
    expect(formDay?.classId).toBe("-987");
    expect(formDay).not.toBe(ownDay);
  });

  it("resolvedTeacherDay resolves teacher schedule directly", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const teacherId = teacherIdOf(store, "Alksne Santa");

    const teacherDay = store.getState().resolvedTeacherDay(DATE, teacherId);
    expect(teacherDay).not.toBeNull();
    expect(teacherDay?.teacherId).toBe(teacherId);
    expect(teacherDay?.lessons.every((l) => Array.isArray(l.classes))).toBe(true);
  });
});
