/**
 * Store ↔ URL router wiring tests, driven through a real store backed by the fixture server
 * and an in-memory `HistoryAdapter`.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "@/db";
import { createSyncEngine } from "@/sync";
import { createAppStore } from "../../store/useAppStore.ts";
import { createMemoryHistory, toSlug, toTeacherSlug } from "@/lib/router";
import { wireRouter } from "@/router";

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

type Store = ReturnType<typeof makeStore>;

const findClassByShort = (store: Store, short: string) => {
  for (const tt of Object.values(store.getState().timetables)) {
    const match = tt.classes.find((c) => c.short === short);
    if (match !== undefined) return match;
  }
  throw new Error(`class ${short} not found in fixture`);
};

const findTeacherByShort = (store: Store, short: string) => {
  for (const tt of Object.values(store.getState().timetables)) {
    const match = tt.teachers.find((t) => t.short === short);
    if (match !== undefined) return match;
  }
  throw new Error(`teacher ${short} not found in fixture`);
};

beforeEach(() => {
  server = createFakeServer();
  cache = createMemoryCache();
});

describe("wireRouter", () => {
  it("selects a class from an incoming /class/:slug URL when timetables are cached", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const cls = findClassByShort(store, "A1-2");

    const history = createMemoryHistory("/class/A1-2");
    const sub = wireRouter(store, history);

    expect(store.getState().settings.persona).toBe("student");
    expect(store.getState().settings.selectedClassId).toBe(cls.id);
    // Normalises casing in-place without adding a history entry.
    expect(history.getPathname()).toBe("/class/a1-2");
    expect(history.entries()).toEqual(["/class/a1-2"]);

    sub.dispose();
  });

  it("selects a teacher from /teacher/:slug in either word order and normalises to name-surname", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const teacher = findTeacherByShort(store, "Baldiņš Kaspars");

    // Reversed order + Latvian diacritics -> resolves and normalises to ASCII name-surname.
    const history = createMemoryHistory("/teacher/baldiņš-kaspars");
    const sub = wireRouter(store, history);

    expect(store.getState().settings.persona).toBe("teacher");
    expect(store.getState().settings.selectedTeacherId).toBe(teacher.id);
    expect(history.getPathname()).toBe("/teacher/kaspars-baldins");
    expect(history.entries()).toEqual(["/teacher/kaspars-baldins"]);

    sub.dispose();
  });

  it("preserves the URL on cold open with empty cache and resolves once timetables arrive", async () => {
    const store = makeStore();
    const history = createMemoryHistory("/class/a1-2");
    const sub = wireRouter(store, history);

    // Before sync finishes: URL must stay intact.
    expect(history.getPathname()).toBe("/class/a1-2");
    expect(store.getState().settings.selectedClassId).toBeNull();

    // Unrelated store updates while still empty keep waiting.
    await store.getState().updateSettings({ lang: "en" });
    expect(history.getPathname()).toBe("/class/a1-2");

    await store.getState().refresh({ date: DATE });
    const cls = findClassByShort(store, "A1-2");
    expect(store.getState().settings.persona).toBe("student");
    expect(store.getState().settings.selectedClassId).toBe(cls.id);
    expect(history.getPathname()).toBe("/class/a1-2");

    sub.dispose();
  });

  it("normalises an unknown slug back to the active subject (or /) once timetables load", async () => {
    const store = makeStore();
    const history = createMemoryHistory("/class/does-not-exist");
    const sub = wireRouter(store, history);

    await store.getState().refresh({ date: DATE });
    expect(store.getState().settings.selectedClassId).toBeNull();
    expect(history.getPathname()).toBe("/");

    sub.dispose();
  });

  it("replaces / with the hydrated subject while preserving query parameters", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const cls = findClassByShort(store, "A1-2");
    await store.getState().setClass(cls.id);

    const history = createMemoryHistory("/?tab=day&date=2026-09-09");
    const sub = wireRouter(store, history);

    expect(history.getPathname()).toBe("/class/a1-2");
    expect(history.getSearch()).toBe("?tab=day&date=2026-09-09");
    expect(history.entries()).toEqual(["/class/a1-2?tab=day&date=2026-09-09"]);

    sub.dispose();
  });

  it("leaves / alone when nothing is selected yet", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });

    const history = createMemoryHistory("/");
    const sub = wireRouter(store, history);

    expect(history.getPathname()).toBe("/");
    expect(history.entries()).toEqual(["/"]);

    sub.dispose();
  });

  it("preserves subgroup and teacherView when reloading the same selection URL", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const cls = findClassByShort(store, "A1-2");
    await store.getState().setClass(cls.id);
    await store.getState().updateSettings({ subgroup: "2" });

    const classHistory = createMemoryHistory("/class/a1-2");
    const sub1 = wireRouter(store, classHistory);
    expect(store.getState().settings.subgroup).toBe("2");
    sub1.dispose();

    const teacher = findTeacherByShort(store, "Alksne Santa");
    await store.getState().updateSettings({ persona: "teacher" });
    await store.getState().setTeacher(teacher.id);
    await store.getState().updateSettings({ teacherView: "form-class" });

    const teacherHistory = createMemoryHistory("/teacher/santa-alksne");
    const sub2 = wireRouter(store, teacherHistory);
    expect(store.getState().settings.teacherView).toBe("form-class");
    sub2.dispose();
  });

  it("pushes history on in-app switches and responds to browser Back/Forward", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const a12 = findClassByShort(store, "A1-2");
    const a21 = findClassByShort(store, "A2-1");
    const teacher = findTeacherByShort(store, "Alksne Santa");

    const history = createMemoryHistory("/");
    const sub = wireRouter(store, history);

    // Entering from `/` replaces rather than pushing.
    await store.getState().setClass(a12.id);
    expect(history.entries()).toEqual([`/class/${toSlug(a12.short)}`]);

    // Switching to another class pushes.
    await store.getState().setClass(a21.id);
    expect(history.entries()).toEqual([
      `/class/${toSlug(a12.short)}`,
      `/class/${toSlug(a21.short)}`,
    ]);

    // Switching to a teacher pushes.
    await store.getState().updateSettings({ persona: "teacher" });
    await store.getState().setTeacher(teacher.id);
    expect(history.getPathname()).toBe(`/teacher/${toTeacherSlug(teacher.short)}`);

    // Back returns to A2-1 (student persona).
    history.back();
    expect(store.getState().settings.persona).toBe("student");
    expect(store.getState().settings.selectedClassId).toBe(a21.id);

    // Back again returns to A1-2.
    history.back();
    expect(store.getState().settings.selectedClassId).toBe(a12.id);

    // Forward returns to A2-1.
    history.forward();
    expect(store.getState().settings.selectedClassId).toBe(a21.id);

    // Resetting user data replaces URL back to `/`.
    await store.getState().resetAllData();
    expect(history.getPathname()).toBe("/");

    sub.dispose();
  });

  it("opens the Week tab (and date) for /class/:slug/week[/:date] and /teacher/:slug/week[/:date]", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const a12 = findClassByShort(store, "A1-2");
    const a21 = findClassByShort(store, "A2-1");
    const teacher = findTeacherByShort(store, "Baldiņš Kaspars");

    const history = createMemoryHistory("/class/A1-2/week/2026-09-07");
    const sub = wireRouter(store, history);

    expect(store.getState().settings.persona).toBe("student");
    expect(store.getState().settings.selectedClassId).toBe(a12.id);
    expect(store.getState().pendingNavigation).toEqual({ tab: "week", date: "2026-09-07" });
    expect(history.getPathname()).toBe("/class/a1-2/week/2026-09-07");

    // Unrelated store updates do not clobber the active week deep link.
    await store.getState().updateSettings({ lang: "en" });
    expect(history.getPathname()).toBe("/class/a1-2/week/2026-09-07");

    // Switching class while on a week URL keeps the week view in the pushed URL.
    await store.getState().setClass(a21.id);
    expect(history.getPathname()).toBe("/class/a2-1/week/2026-09-07");

    // Navigating to a teacher week route without a date opens the week tab for that teacher.
    history.navigate("/teacher/baldiņš-kaspars/week");
    expect(store.getState().settings.persona).toBe("teacher");
    expect(store.getState().settings.selectedTeacherId).toBe(teacher.id);
    expect(store.getState().pendingNavigation).toEqual({ tab: "week" });
    expect(history.getPathname()).toBe("/teacher/kaspars-baldins/week");

    sub.dispose();
  });

  it("stops reacting to store and history events after dispose", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });
    const a12 = findClassByShort(store, "A1-2");
    const a21 = findClassByShort(store, "A2-1");

    const history = createMemoryHistory("/class/a1-2");
    const sub = wireRouter(store, history);
    expect(store.getState().settings.selectedClassId).toBe(a12.id);

    sub.dispose();

    await store.getState().setClass(a21.id);
    expect(history.getPathname()).toBe("/class/a1-2");

    history.navigate("/class/a1-2");
    expect(store.getState().settings.selectedClassId).toBe(a21.id);
  });
});
