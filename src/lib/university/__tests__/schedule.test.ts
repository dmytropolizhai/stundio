import { describe, expect, it } from "vitest";
import {
  coversRange,
  fetchUniversityEvents,
  fetchUniversityGroups,
  fetchUniversityPrograms,
  mergeSchedule,
  pruneDate,
  universityWindow,
} from "../schedule.ts";
import type { UniversityEvent, UniversitySchedule } from "../types.ts";
import { createFakeUniversity } from "./fixtures.ts";

const event = (date: string, id = date): UniversityEvent => ({
  id,
  date,
  start: "10:00",
  end: "11:00",
  subject: "S",
  subjectEn: null,
  subjectCode: null,
  kind: null,
  kindEn: null,
  lecturers: [],
  room: null,
  building: null,
  subgroup: null,
  cancelled: false,
});

describe("universityWindow", () => {
  it("is the viewed week plus the next, Monday to Sunday", () => {
    expect(universityWindow("2026-10-14")).toEqual({ from: "2026-10-12", to: "2026-10-25" });
    expect(universityWindow("2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-25" });
    expect(universityWindow("2026-10-12")).toEqual({ from: "2026-10-12", to: "2026-10-25" });
  });

  it("prunes 14 days back", () => {
    expect(pruneDate("2026-10-12")).toBe("2026-09-28");
  });
});

describe("mergeSchedule", () => {
  const base: UniversitySchedule = {
    university: "lu",
    groupId: "g",
    events: [event("2026-10-01"), event("2026-10-13", "old")],
    covered: [{ from: "2026-09-28", to: "2026-10-18" }],
    fetchedAt: "2026-10-10T00:00:00.000Z",
  };

  it("replaces the fetched range and keeps the rest", () => {
    const merged = mergeSchedule(
      base,
      {
        university: "lu",
        groupId: "g",
        range: { from: "2026-10-12", to: "2026-10-25" },
        events: [event("2026-10-20", "new")],
        fetchedAt: "2026-10-12T00:00:00.000Z",
      },
      "2026-09-28",
    );
    expect(merged.events.map((e) => e.id)).toEqual(["2026-10-01", "new"]);
    expect(merged.covered).toEqual([{ from: "2026-09-28", to: "2026-10-25" }]);
    expect(merged.fetchedAt).toBe("2026-10-12T00:00:00.000Z");
    expect(coversRange(merged, { from: "2026-10-12", to: "2026-10-25" })).toBe(true);
    expect(coversRange(merged, { from: "2026-10-26", to: "2026-11-08" })).toBe(false);
    expect(coversRange(null, { from: "2026-10-12", to: "2026-10-25" })).toBe(false);
  });

  it("keeps separate stretches apart and prunes old ones", () => {
    const merged = mergeSchedule(
      base,
      {
        university: "lu",
        groupId: "g",
        range: { from: "2026-11-09", to: "2026-11-22" },
        events: [],
        fetchedAt: "2026-10-12T00:00:00.000Z",
      },
      "2026-10-05",
    );
    expect(merged.covered).toEqual([
      { from: "2026-10-05", to: "2026-10-18" },
      { from: "2026-11-09", to: "2026-11-22" },
    ]);
    expect(merged.events.map((e) => e.id)).toEqual(["old"]);
  });

  it("starts over for another group", () => {
    const merged = mergeSchedule(
      base,
      {
        university: "rtu",
        groupId: "1",
        range: { from: "2026-10-12", to: "2026-10-25" },
        events: [],
        fetchedAt: "2026-10-12T00:00:00.000Z",
      },
      "2026-09-28",
    );
    expect(merged.events).toEqual([]);
    expect(merged.covered).toEqual([{ from: "2026-10-12", to: "2026-10-25" }]);
  });
});

describe("source-agnostic fetchers", () => {
  it("fetches events from either university", async () => {
    const fake = createFakeUniversity();
    const range = { from: "2026-10-12", to: "2026-10-25" };
    expect((await fetchUniversityEvents(fake.http, "lu", "26R-21023-PLK-1", range)).length).toBe(
      33,
    );
    expect((await fetchUniversityEvents(fake.http, "rtu", "38532", range)).length).toBeGreaterThan(
      0,
    );
  });

  it("lists RTU programs for the current semester, then their groups", async () => {
    const fake = createFakeUniversity();
    const programs = await fetchUniversityPrograms(fake.http, "rtu");
    expect(programs[0]).toMatchObject({ id: "227", semesterId: "31" });
    const first = programs[0];
    if (first === undefined) throw new Error("no program");
    expect((await fetchUniversityGroups(fake.http, first)).map((g) => g.id)).toEqual([
      "38532",
      "38536",
    ]);
    expect(
      await fetchUniversityGroups(fake.http, { ...first, semesterId: undefined } as never),
    ).toEqual([]);
  });

  it("lists LU programs with their groups already attached", async () => {
    const fake = createFakeUniversity();
    const programs = await fetchUniversityPrograms(fake.http, "lu");
    const first = programs[0];
    if (first === undefined) throw new Error("no program");
    const before = fake.requests.length;
    expect((await fetchUniversityGroups(fake.http, first)).length).toBe(1);
    expect(fake.requests.length).toBe(before);
  });
});

describe("name language", () => {
  it("follows the app language on auto and the user's pick otherwise", async () => {
    const { resolveUniversityNames, programTitle } = await import("../types.ts");
    expect(resolveUniversityNames("auto", "lv")).toBe("lv");
    expect(resolveUniversityNames("auto", "ru")).toBe("en");
    expect(resolveUniversityNames("lv", "en")).toBe("lv");
    expect(resolveUniversityNames("en", "lv")).toBe("en");
    expect(programTitle({ title: "Fizika", titleEn: "Physics" }, "en")).toBe("Physics");
    expect(programTitle({ title: "Fizika", titleEn: null }, "en")).toBe("Fizika");
    expect(programTitle({ title: "Fizika", titleEn: "Physics" }, "lv")).toBe("Fizika");
  });
});
