/**
 * resolveDay — MODEL.md §5. Exercised end-to-end on the 2026-09-09 fixtures: the real
 * timetable (tt_num 1175, Galvenā ēka) merged with the real substitutions for that day.
 */
import { describe, expect, it } from "vitest";
import { FIXTURE_DATE, FIXTURES, readFixture, readJsonFixture } from "./fixtures.ts";
import { normalizeTimetable, toTimetableMeta, type RawTables } from "../normalize.ts";
import { parseDaySubstitutions } from "../substitutions.ts";
import { resolveDay, weekdayOf } from "../resolve.ts";
import type { DaySubstitutions, Timetable } from "../types.ts";

type RawRegular = { r: { dbiAccessorRes: { tables: { id: string; data_rows?: unknown[] }[] } } };

const tables: RawTables = Object.fromEntries(
  readJsonFixture<RawRegular>(FIXTURES.regulartt).r.dbiAccessorRes.tables.map((t) => [
    t.id,
    (t.data_rows ?? []) as Record<string, unknown>[],
  ]),
);

const timetable: Timetable = normalizeTimetable(
  tables,
  toTimetableMeta(
    {
      tt_num: "1175",
      text: "Galvenā ēka 07.09.2026. (07. 09. - 11. 09. 2026)",
      datefrom: "2026-09-07",
      year: 2026,
    },
    "2026-09-09T00:00:00.000Z",
  ),
).timetable;

const subs: DaySubstitutions = parseDaySubstitutions(
  readFixture(FIXTURES.substHtml),
  FIXTURE_DATE,
  "2026-09-09T00:00:00.000Z",
);

const classId = (short: string): string =>
  timetable.classes.find((c) => c.short === short)?.id ?? "";

describe("weekdayOf", () => {
  it("reads the weekday without timezone drift", () => {
    expect(weekdayOf("2026-09-09")).toBe("wed");
    expect(weekdayOf("2026-09-07")).toBe("mon");
    expect(weekdayOf("2026-09-13")).toBe("sun");
  });
});

// DT3-2 has 11 Wednesday lessons and no substitutions on 2026-09-09.
describe("resolveDay — a class with no substitutions", () => {
  const day = resolveDay(timetable, subs, classId("DT3-2"), FIXTURE_DATE);

  it("returns the plain base timetable", () => {
    expect(day.lessons.length).toBeGreaterThan(0);
    expect(day.lessons.every((l) => l.status === "normal")).toBe(true);
    expect(day.lessons.every((l) => l.changeNote === null)).toBe(true);
  });

  it("fills times from the periods table", () => {
    const first = day.lessons[0];
    expect(first?.start).toMatch(/^\d{2}:\d{2}$/);
    expect(first?.end).toMatch(/^\d{2}:\d{2}$/);
  });

  it("reports the base timetable it used and is not stale", () => {
    expect(day.ttNum).toBe("1175");
    expect(day.building).toBe("Galvenā ēka");
    expect(day.stale).toBe(false);
    expect(day.weekday).toBe("wed");
  });
});

describe("resolveDay — A1-2, which has real changes that day", () => {
  const day = resolveDay(timetable, subs, classId("A1-2"), FIXTURE_DATE);

  it("keeps cancelled lessons visible instead of dropping them", () => {
    const cancelled = day.lessons.filter((l) => l.status === "cancelled");
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every((l) => l.changeNote !== null)).toBe(true);
  });

  it("applies the teacher swap and keeps the original for a diff view", () => {
    const swapped = day.lessons.find((l) => l.status === "substituted");
    expect(swapped).toBeDefined();
    expect(swapped?.teachers.map((t) => t.short)).toEqual(["Edgars Geislers"]);
    expect(swapped?.original?.teachers?.map((t) => t.short)).not.toEqual(["Edgars Geislers"]);
  });

  it("adds the moved-in lesson as its own row", () => {
    const added = day.lessons.filter((l) => l.status === "added");
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((l) => l.changeNote !== null)).toBe(true);
  });

  it("sorts every row by period", () => {
    const periods = day.lessons.map((l) => Number(l.period));
    expect(periods).toEqual([...periods].sort((a, b) => a - b));
  });

  it("passes the day's announcements through untranslated", () => {
    expect(day.notes).toEqual(subs.notes);
    expect(day.notes.length).toBeGreaterThan(0);
  });

  it("uses Substitution.raw verbatim as the change note", () => {
    const changed = day.lessons.find((l) => l.changeNote !== null);
    const rawTexts = subs.items.map((i) => i.raw);
    expect(rawTexts.some((r) => changed?.changeNote?.includes(r) === true)).toBe(true);
  });
});

describe("resolveDay — invariants across every class with changes", () => {
  const changed = [...new Set(subs.items.map((i) => i.className))];

  it("covers classes that exist in this building's timetable", () => {
    const known = changed.filter((short) => classId(short) !== "");
    expect(known.length).toBeGreaterThan(0);
  });

  it("never loses a lesson and never throws", () => {
    for (const short of changed) {
      const id = classId(short);
      if (id === "") continue;
      const base = timetable.lessons.filter((l) => l.classIds.includes(id) && l.day === "wed");
      const day = resolveDay(timetable, subs, id, FIXTURE_DATE);
      // Every base lesson survives; extra rows only ever come from moved_in/added.
      expect(day.lessons.length).toBeGreaterThanOrEqual(base.length);
      expect(day.lessons.filter((l) => l.status === "added").length).toBe(
        day.lessons.length - base.length,
      );
    }
  });

  it("does not double-count a lesson moved out of one period into another", () => {
    // moved_out empties the source slot; moved_in creates the target. The same subject
    // may legitimately appear twice, but never with two identical (period, subject) rows.
    for (const short of changed) {
      const id = classId(short);
      if (id === "") continue;
      const day = resolveDay(timetable, subs, id, FIXTURE_DATE);
      const keys = day.lessons.map((l) => `${l.period}|${l.subject?.id ?? ""}|${l.group ?? ""}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("resolveDay — degenerate inputs", () => {
  it("returns an empty day for an unknown class", () => {
    const day = resolveDay(timetable, subs, "not-a-class", FIXTURE_DATE);
    expect(day.lessons).toEqual([]);
  });

  it("works with no substitutions at all (offline / not published)", () => {
    const day = resolveDay(timetable, null, classId("A1-2"), FIXTURE_DATE);
    expect(day.lessons.every((l) => l.status === "normal")).toBe(true);
    expect(day.notes).toEqual([]);
  });

  it("flags stale when the date falls outside the base timetable's week", () => {
    expect(resolveDay(timetable, null, classId("DT3-2"), "2026-09-16").stale).toBe(true);
  });

  it("returns an empty day for a weekend", () => {
    expect(resolveDay(timetable, null, classId("DT3-2"), "2026-09-12").lessons).toEqual([]);
  });
});
