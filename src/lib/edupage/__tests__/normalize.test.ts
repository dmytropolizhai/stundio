/**
 * normalize.ts is checked against the fixture's own counts and against the Python probe's
 * normalized_1175.json, which is the oracle for the cards→lessons→groups join.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES, readJsonFixture } from "./fixtures.ts";
import {
  normalizeTimetable,
  parseTimetableLabel,
  toTimetableMeta,
  weekdayFromBitmask,
  type RawTables,
} from "../normalize.ts";
import type { TimetableMeta } from "../types.ts";

type RawRegular = { r: { dbiAccessorRes: { tables: { id: string; data_rows?: unknown[] }[] } } };

const tables: RawTables = Object.fromEntries(
  readJsonFixture<RawRegular>(FIXTURES.regulartt).r.dbiAccessorRes.tables.map((t) => [
    t.id,
    (t.data_rows ?? []) as Record<string, unknown>[],
  ]),
);

const meta: TimetableMeta = toTimetableMeta(
  {
    tt_num: "1175",
    text: "Galvenā ēka 07.09.2026. (07. 09. - 11. 09. 2026)",
    datefrom: "2026-09-07",
    year: 2026,
  },
  "2026-09-09T00:00:00.000Z",
);

const { timetable, stats } = normalizeTimetable(tables, meta);

/** Probe output: one row per (card × class), with display names rather than ids. */
type OracleSlot = {
  class: string | null;
  day: string;
  period: string;
  subject_short: string | null;
  teachers: (string | null)[];
  rooms: (string | null)[];
};
const oracle = readJsonFixture<{ slots: OracleSlot[]; classes: string[] }>(FIXTURES.normalized);

describe("weekdayFromBitmask", () => {
  it("maps the first set bit to a weekday", () => {
    expect(weekdayFromBitmask("10000")).toBe("mon");
    expect(weekdayFromBitmask("00100")).toBe("wed");
    expect(weekdayFromBitmask("00001")).toBe("fri");
  });

  it("returns null for an unplaced card", () => {
    expect(weekdayFromBitmask("")).toBeNull();
    expect(weekdayFromBitmask("00000")).toBeNull();
  });
});

describe("parseTimetableLabel", () => {
  it("splits building from the date range", () => {
    expect(parseTimetableLabel("Galvenā ēka 07.09.2026. (07. 09. - 11. 09. 2026)")).toEqual({
      building: "Galvenā ēka",
      validTo: "2026-09-11",
    });
    expect(parseTimetableLabel("TIC 01.09.2026. (01. 09. - 04. 09. 2026)")).toEqual({
      building: "TIC",
      validTo: "2026-09-04",
    });
  });

  it("survives a label with no range", () => {
    expect(parseTimetableLabel("TIC")).toEqual({ building: "TIC", validTo: null });
  });
});

describe("normalizeTimetable", () => {
  it("reads the documented entity counts (MODEL.md §2)", () => {
    expect(timetable.periods).toHaveLength(13);
    expect(timetable.classes).toHaveLength(122);
    expect(timetable.teachers).toHaveLength(147);
    expect(timetable.subjects).toHaveLength(466);
    expect(timetable.rooms).toHaveLength(160);
  });

  it("drops unplaced cards (empty `days` bitmask)", () => {
    expect(stats.cards).toBe(3336);
    expect(stats.placedCards).toBe(2768);
  });

  it("expands one card per class, matching the probe's slot count", () => {
    const slots = timetable.lessons.reduce((n, l) => n + l.classIds.length, 0);
    expect(slots).toBe(oracle.slots.length);
  });

  it("fills `short` for teachers, who have no `name` at this school", () => {
    const teacher = timetable.teachers.find((t) => t.id === "-403");
    expect(teacher?.short).toBe("Abrama Ivita");
    expect(teacher?.name).toBe("Abrama Ivita"); // backfilled from short
  });

  it("reproduces a known class's Monday exactly as the probe sees it", () => {
    const cls = timetable.classes.find((c) => c.short === "A1-1");
    expect(cls).toBeDefined();
    const subjects = new Map(timetable.subjects.map((s) => [s.id, s]));

    const mine = timetable.lessons
      .filter((l) => l.classIds.includes(cls?.id ?? "") && l.day === "mon")
      .map((l) => `${l.period}:${subjects.get(l.subjectId)?.short ?? "?"}`)
      .sort();

    const theirs = oracle.slots
      .filter((s) => s.class === "A1-1" && s.day === "Mon")
      .map((s) => `${s.period}:${s.subject_short ?? "?"}`)
      .sort();

    expect(mine).toEqual(theirs);
    expect(mine.length).toBeGreaterThan(0);
  });

  it("carries group labels the substitution feed can match ('1' / '2')", () => {
    const divided = timetable.lessons.filter((l) => l.groups.length > 0);
    expect(divided.length).toBeGreaterThan(0);
    expect([...new Set(divided.flatMap((l) => l.groups))].sort()).toEqual(["1", "2"]);
  });

  it("takes termMask from the lesson — cards carry no `terms` field", () => {
    expect(tables["cards"]?.every((c) => !("terms" in c))).toBe(true);
    expect(timetable.lessons.every((l) => l.termMask === "1")).toBe(true);
  });

  it("reports cards it could not attribute to any class", () => {
    // 64 placed cards belong to lessons with neither classids nor groupids.
    expect(stats.orphanCards).toBe(64);
  });
});
