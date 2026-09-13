/**
 * resolveDay — MODEL.md §5. Exercised end-to-end on the 2026-09-09 fixtures: the real
 * timetable (tt_num 1175, Galvenā ēka) merged with the real substitutions for that day.
 */
import { describe, expect, it } from "vitest";
import { FIXTURE_DATE, FIXTURES, readFixture, readJsonFixture } from "./fixtures.ts";
import { normalizeTimetable, toTimetableMeta, type RawTables } from "../normalize.ts";
import { parseDaySubstitutions } from "../substitutions.ts";
import { classWeekLessons, resolveDay, resolveDayAcross, weekdayOf } from "../resolve.ts";
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

/* ------------------------------------------------------------------ *
 * resolveDayAcross — automatic building mode (MODEL.md §3)
 * ------------------------------------------------------------------ */

const PERIODS = [
  { period: "1", name: "1", start: "08:30", end: "09:10" },
  { period: "2", name: "2", start: "09:20", end: "10:00" },
];

/**
 * A one-class, one-day timetable. Small on purpose: the cross-building rules are about which
 * *source* wins, so hand-built sources say more here than the 122-class fixture would.
 */
const fakeTimetable = (
  building: string,
  ttNum: string,
  lessons: { period: string; subject: string; teacher?: string; room?: string; span?: number }[],
): Timetable => ({
  meta: {
    ttNum,
    building,
    validFrom: "2026-09-07",
    validTo: "2026-09-11",
    label: `${building} 07.09.2026.`,
    schoolYear: 2026,
    fetchedAt: "2026-09-09T00:00:00.000Z",
  },
  periods: PERIODS,
  classes: [{ id: "c1", name: "AV1-1", short: "AV1-1", color: null }],
  teachers: lessons
    .filter((l) => l.teacher !== undefined)
    .map((l) => ({ id: `t:${l.teacher ?? ""}`, name: "", short: l.teacher ?? "", color: null })),
  subjects: lessons.map((l) => ({ id: `s:${l.subject}`, name: l.subject, short: l.subject })),
  rooms: lessons
    .filter((l) => l.room !== undefined)
    .map((l) => ({ id: `r:${l.room ?? ""}`, name: l.room ?? "", short: l.room ?? "" })),
  lessons: lessons.map((l, i) => ({
    id: `${ttNum}-${String(i)}`,
    classIds: ["c1"],
    groups: [],
    subjectId: `s:${l.subject}`,
    teacherIds: l.teacher === undefined ? [] : [`t:${l.teacher}`],
    roomIds: l.room === undefined ? [] : [`r:${l.room}`],
    day: "wed",
    period: l.period,
    periodSpan: l.span ?? 1,
    weekMask: "1",
    termMask: "1",
  })),
});

/** What the main building publishes for a class that is at the annex that day. */
const pointerDay = fakeTimetable("Galvenā ēka", "1175", [
  { period: "1", subject: "Tehnoloģiju un inovāciju centrs Dārzciema ielā", span: 7 },
]);
const annexDay = fakeTimetable("TIC", "1174", [
  { period: "1", subject: "Remonta pamati", teacher: "Kalns A", room: "12" },
  { period: "2", subject: "Demontāža un montāža", teacher: "Kalns A", room: "12" },
]);
const olaineDay = fakeTimetable("TIC Olaine", "1177", [
  { period: "1", subject: "Ķīmija I", teacher: "Ozols B", room: "3" },
]);

describe("resolveDayAcross", () => {
  it("drops the pointer row and shows the building that actually has the lessons", () => {
    const day = resolveDayAcross(
      [{ timetable: pointerDay }, { timetable: annexDay }],
      null,
      "c1",
      FIXTURE_DATE,
    );

    expect(day.lessons.map((l) => l.subject?.short)).toEqual([
      "Remonta pamati",
      "Demontāža un montāža",
    ]);
    expect(day.building).toBe("TIC");
    expect(day.buildings).toEqual(["TIC"]);
    expect(day.ttNum).toBe("1174");
  });

  it("tags every lesson with the building it came from", () => {
    const day = resolveDayAcross(
      [{ timetable: pointerDay }, { timetable: annexDay }],
      null,
      "c1",
      FIXTURE_DATE,
    );
    expect(day.lessons.every((l) => l.building === "TIC")).toBe(true);
  });

  it("keeps the pointer when no other building has that day — it is all the user has", () => {
    const day = resolveDayAcross([{ timetable: pointerDay }], null, "c1", FIXTURE_DATE);
    expect(day.lessons).toHaveLength(1);
    expect(day.building).toBe("Galvenā ēka");
  });

  it("resolves a class that only exists in a building added mid-year", () => {
    const day = resolveDayAcross(
      [{ timetable: pointerDay }, { timetable: annexDay }, { timetable: olaineDay }],
      null,
      "c1",
      FIXTURE_DATE,
    );
    // Both annexes have real lessons for this class, so both contribute.
    expect(day.buildings).toEqual(["TIC", "TIC Olaine"]);
    expect(day.lessons.map((l) => l.building)).toEqual(["TIC", "TIC Olaine", "TIC"]);
  });

  it("merges two buildings without duplicating a lesson they both publish", () => {
    const day = resolveDayAcross(
      [
        { timetable: annexDay },
        {
          timetable: { ...annexDay, meta: { ...annexDay.meta, ttNum: "1176", building: "TIC 2" } },
        },
      ],
      null,
      "c1",
      FIXTURE_DATE,
    );
    expect(day.lessons).toHaveLength(2);
    expect(day.buildings).toEqual(["TIC"]);
  });

  it("applies a substitution once, not once per source", () => {
    const cancelled: DaySubstitutions = {
      date: FIXTURE_DATE,
      mode: "classes",
      notes: [],
      fetchedAt: "2026-09-09T00:00:00.000Z",
      items: [
        {
          date: FIXTURE_DATE,
          className: "AV1-1",
          group: null,
          periods: [1],
          isOriginalSlot: false,
          kind: "cancelled",
          subject: null,
          subjectFrom: null,
          teacher: null,
          teacherFrom: null,
          room: null,
          roomFrom: null,
          movedFromPeriod: null,
          movedToPeriod: null,
          movedFromDate: null,
          movedToDate: null,
          raw: "Atcelts",
        },
        {
          date: FIXTURE_DATE,
          className: "AV1-1",
          group: null,
          periods: [2],
          isOriginalSlot: false,
          kind: "added",
          subject: "Sports",
          subjectFrom: null,
          teacher: null,
          teacherFrom: null,
          room: null,
          roomFrom: null,
          movedFromPeriod: null,
          movedToPeriod: null,
          movedFromDate: null,
          movedToDate: null,
          raw: "Added",
        },
      ],
    };

    const day = resolveDayAcross(
      [{ timetable: pointerDay }, { timetable: annexDay }, { timetable: olaineDay }],
      cancelled,
      "c1",
      FIXTURE_DATE,
    );

    expect(day.lessons.filter((l) => l.status === "added")).toHaveLength(1);
    expect(day.lessons.filter((l) => l.status === "cancelled").length).toBeGreaterThan(0);
  });

  it("takes its staleness from the source that leads the day", () => {
    const day = resolveDayAcross(
      [
        { timetable: pointerDay, stale: true },
        { timetable: annexDay, stale: false },
      ],
      null,
      "c1",
      FIXTURE_DATE,
    );
    expect(day.stale).toBe(false);
  });

  it("returns an empty day when no source has anything", () => {
    const day = resolveDayAcross([], null, "c1", FIXTURE_DATE);
    expect(day.lessons).toEqual([]);
    expect(day.buildings).toEqual([]);
  });
});

describe("classWeekLessons", () => {
  it("drops the pointer row from the week the subject catalogue is built on", () => {
    const week = classWeekLessons([pointerDay, annexDay], "c1");
    expect(
      week.map(
        ({ lesson, timetable }) => timetable.subjects.find((s) => s.id === lesson.subjectId)?.short,
      ),
    ).toEqual(["Remonta pamati", "Demontāža un montāža"]);
  });

  it("keeps a class's lessons from every building it is taught in", () => {
    const week = classWeekLessons([annexDay, olaineDay], "c1");
    expect(week.map(({ timetable }) => timetable.meta.building)).toEqual([
      "TIC",
      "TIC",
      "TIC Olaine",
    ]);
  });

  it("counts a lesson two buildings both publish only once", () => {
    const copy = { ...annexDay, meta: { ...annexDay.meta, ttNum: "1176", building: "TIC 2" } };
    expect(classWeekLessons([annexDay, copy], "c1")).toHaveLength(2);
  });

  it("keeps a teacher-less lesson when it is the only thing that week", () => {
    expect(classWeekLessons([pointerDay], "c1")).toHaveLength(1);
  });
});
