import { describe, expect, it, vi } from "vitest";
import type { Timetable } from "@/lib/edupage";
import type { PersonaSubject } from "@/lib/persona";
import {
  PUBLIC_APP_ORIGIN,
  browserHistory,
  buildShareUrl,
  createMemoryHistory,
  formatRoute,
  parseRoute,
  resolveRouteTarget,
  routeFromSubject,
  teacherSlugKey,
  toSlug,
  toTeacherSlug,
} from "@/lib/router";

const makeTimetable = (overrides?: Partial<Timetable>): Timetable => ({
  meta: {
    ttNum: "1175",
    building: "Galvenā ēka",
    validFrom: "2026-09-07",
    label: "Galvenā ēka",
    schoolYear: 2026,
    fetchedAt: "2026-09-09T08:00:00Z",
  },
  periods: [],
  classes: [
    { id: "-1", short: "DP2-1", name: "DP2-1" },
    { id: "-2", short: "A1-2", name: "A1-2" },
    { id: "-3", short: "", name: "DT3-1" },
  ],
  teachers: [
    { id: "-10", short: "Bumanis Agris", name: "Bumanis Agris" },
    { id: "-11", short: "Baldiņš Kaspars", name: "Baldiņš Kaspars" },
    { id: "-12", short: "Allena Katrīna Anna", name: "Allena Katrīna Anna" },
    { id: "-13", short: "", name: "Ķere Gene" },
  ],
  subjects: [],
  rooms: [],
  lessons: [],
  ...overrides,
});

describe("slug helpers", () => {
  it("normalises class shorts to lowercase ASCII slugs", () => {
    expect(toSlug("DP2-1")).toBe("dp2-1");
    expect(toSlug("  A1-2  ")).toBe("a1-2");
    expect(toSlug("Āēīū 1/2")).toBe("aeiu-1-2");
    expect(toSlug("---")).toBe("");
  });

  it("reorders EduPage 'Surname Name' labels into 'name-surname' teacher slugs", () => {
    expect(toTeacherSlug("Bumanis Agris")).toBe("agris-bumanis");
    expect(toTeacherSlug("Baldiņš Kaspars")).toBe("kaspars-baldins");
    expect(toTeacherSlug("Allena Katrīna Anna")).toBe("katrina-anna-allena");
    expect(toTeacherSlug("Bumanis")).toBe("bumanis");
    expect(toTeacherSlug("   ")).toBe("");
  });

  it("matches teacher names regardless of word order or Latvian diacritics", () => {
    expect(teacherSlugKey("Agris Bumanis")).toBe(teacherSlugKey("Bumanis Agris"));
    expect(teacherSlugKey("agris-bumanis")).toBe(teacherSlugKey("Bumanis Agris"));
    expect(teacherSlugKey("bumanis-agris")).toBe(teacherSlugKey("Bumanis Agris"));
    expect(teacherSlugKey("kaspars-baldins")).toBe(teacherSlugKey("Baldiņš Kaspars"));
    expect(teacherSlugKey("baldiņš-kaspars")).toBe(teacherSlugKey("Baldiņš Kaspars"));
  });
});

describe("codec", () => {
  it("parses class and teacher routes and normalises slugs", () => {
    expect(parseRoute("/class/dp2-1")).toEqual({ kind: "class", slug: "dp2-1" });
    expect(parseRoute("/class/DP2-1/")).toEqual({ kind: "class", slug: "dp2-1" });
    expect(parseRoute("/teacher/agris-bumanis")).toEqual({
      kind: "teacher",
      slug: "agris-bumanis",
    });
    expect(parseRoute("/teacher/baldi%C5%86%C5%A1-kaspars")).toEqual({
      kind: "teacher",
      slug: "baldins-kaspars",
    });
    expect(parseRoute("/class/dp2-1/week")).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
    });
    expect(parseRoute("/class/DP2-1/week/2026-09-07")).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
      date: "2026-09-07",
    });
    expect(parseRoute("/teacher/agris-bumanis/week/2026-09-07")).toEqual({
      kind: "teacher",
      slug: "agris-bumanis",
      view: "week",
      date: "2026-09-07",
    });
    // Invalid calendar date degrades gracefully to the week route without a date.
    expect(parseRoute("/class/dp2-1/week/2026-02-31")).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
    });
    expect(parseRoute("/class/dp2-1/week/not-a-date")).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
    });
  });

  it("falls back to root for unknown, malformed, or empty paths", () => {
    expect(parseRoute("/")).toEqual({ kind: "root" });
    expect(parseRoute("/unknown/dp2-1")).toEqual({ kind: "root" });
    expect(parseRoute("/class")).toEqual({ kind: "root" });
    expect(parseRoute("/class/dp2-1/extra")).toEqual({ kind: "root" });
    expect(parseRoute("/class/dp2-1/week/2026-09-07/extra")).toEqual({ kind: "root" });
    expect(parseRoute("/class/---")).toEqual({ kind: "root" });
    expect(parseRoute("/class/%E0%A4%A")).toEqual({ kind: "class", slug: "e0-a4-a" });
  });

  it("formats routes back to canonical pathnames and full share URLs", () => {
    expect(formatRoute({ kind: "root" })).toBe("/");
    expect(formatRoute({ kind: "class", slug: "dp2-1" })).toBe("/class/dp2-1");
    expect(formatRoute({ kind: "class", slug: "dp2-1", view: "week" })).toBe("/class/dp2-1/week");
    expect(formatRoute({ kind: "class", slug: "dp2-1", view: "week", date: "2026-09-07" })).toBe(
      "/class/dp2-1/week/2026-09-07",
    );
    expect(formatRoute({ kind: "teacher", slug: "agris-bumanis" })).toBe("/teacher/agris-bumanis");
    expect(
      formatRoute({ kind: "teacher", slug: "agris-bumanis", view: "week", date: "2026-09-07" }),
    ).toBe("/teacher/agris-bumanis/week/2026-09-07");

    expect(buildShareUrl({ kind: "class", slug: "dp2-1", view: "week", date: "2026-09-07" })).toBe(
      `${PUBLIC_APP_ORIGIN}/class/dp2-1/week/2026-09-07`,
    );
    expect(buildShareUrl({ kind: "root" }, "https://app.stundio.lv/")).toBe(
      "https://app.stundio.lv/",
    );
  });

  it("derives canonical routes from PersonaSubject", () => {
    expect(routeFromSubject(null)).toEqual({ kind: "root" });

    const student: PersonaSubject = {
      persona: "student",
      class: { id: "-1", ref: null, label: "DP2-1", formTeacher: null },
    };
    expect(routeFromSubject(student)).toEqual({ kind: "class", slug: "dp2-1" });
    expect(routeFromSubject(student, { view: "week" })).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
    });
    expect(routeFromSubject(student, { view: "week", date: "2026-09-07" })).toEqual({
      kind: "class",
      slug: "dp2-1",
      view: "week",
      date: "2026-09-07",
    });

    const studentNoLabel: PersonaSubject = {
      persona: "student",
      class: { id: "-1", ref: null, label: null, formTeacher: null },
    };
    expect(routeFromSubject(studentNoLabel)).toEqual({ kind: "root" });

    const studentEmptySlug: PersonaSubject = {
      persona: "student",
      class: { id: "-1", ref: null, label: "---", formTeacher: null },
    };
    expect(routeFromSubject(studentEmptySlug)).toEqual({ kind: "root" });

    const teacher: PersonaSubject = {
      persona: "teacher",
      teacher: { id: "-10", ref: null, label: "Bumanis Agris", feedKey: "agris bumanis" },
      view: "own",
      formClass: null,
    };
    expect(routeFromSubject(teacher)).toEqual({ kind: "teacher", slug: "agris-bumanis" });

    const teacherNoLabel: PersonaSubject = {
      persona: "teacher",
      teacher: { id: "-10", ref: null, label: null, feedKey: null },
      view: "own",
      formClass: null,
    };
    expect(routeFromSubject(teacherNoLabel)).toEqual({ kind: "root" });

    const teacherEmptySlug: PersonaSubject = {
      persona: "teacher",
      teacher: { id: "-10", ref: null, label: "---", feedKey: null },
      view: "own",
      formClass: null,
    };
    expect(routeFromSubject(teacherEmptySlug)).toEqual({ kind: "root" });
  });
});

describe("resolveRouteTarget", () => {
  const timetables = [makeTimetable()];

  it("returns null for root routes", () => {
    expect(resolveRouteTarget({ kind: "root" }, timetables)).toBeNull();
  });

  it("resolves class routes by short or name", () => {
    expect(resolveRouteTarget({ kind: "class", slug: "dp2-1" }, timetables)).toEqual({
      persona: "student",
      classId: "-1",
    });
    expect(resolveRouteTarget({ kind: "class", slug: "dt3-1" }, timetables)).toEqual({
      persona: "student",
      classId: "-3",
    });
    expect(resolveRouteTarget({ kind: "class", slug: "unknown" }, timetables)).toBeNull();
    expect(resolveRouteTarget({ kind: "class", slug: "" }, timetables)).toBeNull();
  });

  it("resolves teacher routes regardless of word order or diacritics", () => {
    expect(resolveRouteTarget({ kind: "teacher", slug: "agris-bumanis" }, timetables)).toEqual({
      persona: "teacher",
      teacherId: "-10",
    });
    expect(resolveRouteTarget({ kind: "teacher", slug: "bumanis-agris" }, timetables)).toEqual({
      persona: "teacher",
      teacherId: "-10",
    });
    expect(resolveRouteTarget({ kind: "teacher", slug: "kaspars-baldins" }, timetables)).toEqual({
      persona: "teacher",
      teacherId: "-11",
    });
    expect(resolveRouteTarget({ kind: "teacher", slug: "gene-kere" }, timetables)).toEqual({
      persona: "teacher",
      teacherId: "-13",
    });
    expect(resolveRouteTarget({ kind: "teacher", slug: "nobody" }, timetables)).toBeNull();
    expect(resolveRouteTarget({ kind: "teacher", slug: "" }, timetables)).toBeNull();
  });
});

describe("history adapters", () => {
  it("tracks push, replace, back, forward, navigate, and search in memoryHistory", () => {
    const history = createMemoryHistory("/class/dp2-1?tab=day");
    expect(history.getPathname()).toBe("/class/dp2-1");
    expect(history.getSearch()).toBe("?tab=day");

    const listener = vi.fn();
    const unsub = history.subscribe(listener);

    // Back at index 0 is a no-op
    history.back();
    expect(listener).not.toHaveBeenCalled();

    history.push("/class/a1-2");
    expect(history.getPathname()).toBe("/class/a1-2");
    expect(history.getSearch()).toBe("");
    expect(history.entries()).toEqual(["/class/dp2-1?tab=day", "/class/a1-2"]);

    // Forward at end is a no-op
    history.forward();
    expect(listener).not.toHaveBeenCalled();

    history.back();
    expect(history.getPathname()).toBe("/class/dp2-1");
    expect(listener).toHaveBeenCalledTimes(1);

    history.forward();
    expect(history.getPathname()).toBe("/class/a1-2");
    expect(listener).toHaveBeenCalledTimes(2);

    history.replace("/teacher/agris-bumanis");
    expect(history.entries()).toEqual(["/class/dp2-1?tab=day", "/teacher/agris-bumanis"]);

    history.navigate("/class/dp2-1");
    expect(history.getPathname()).toBe("/class/dp2-1");
    expect(listener).toHaveBeenCalledTimes(3);

    unsub();
    history.back();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("wraps window.history and popstate in browserHistory", () => {
    window.history.replaceState(null, "", "/?tab=day");
    expect(browserHistory.getPathname()).toBe("/");
    expect(browserHistory.getSearch()).toBe("?tab=day");

    browserHistory.push("/class/dp2-1");
    expect(browserHistory.getPathname()).toBe("/class/dp2-1");

    browserHistory.replace("/teacher/agris-bumanis");
    expect(browserHistory.getPathname()).toBe("/teacher/agris-bumanis");

    const listener = vi.fn();
    const unsub = browserHistory.subscribe(listener);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(listener).toHaveBeenCalledTimes(1);

    window.history.replaceState(null, "", "/");
  });
});
