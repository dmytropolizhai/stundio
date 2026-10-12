import { describe, expect, it } from "vitest";
import { parseLuEvents } from "../lu.ts";
import { parseRtuEvents, parseRtuSubjects } from "../rtu.ts";
import {
  isCovered,
  listUniversitySubgroups,
  resolveUniversityDay,
  slotsOf,
  UNIVERSITY_SLOTS,
} from "../resolve.ts";
import type { UniversityEvent, UniversitySchedule } from "../types.ts";
import { LU, readFixture, readJsonFixture, RTU } from "./fixtures.ts";

const rtu: UniversitySchedule = {
  university: "rtu",
  groupId: "38532",
  events: parseRtuEvents(
    readJsonFixture(RTU.events),
    parseRtuSubjects(readJsonFixture(RTU.subjects)),
  ),
  covered: [{ from: "2026-10-01", to: "2026-10-31" }],
  fetchedAt: "2026-10-12T08:00:00.000Z",
};

const lu: UniversitySchedule = {
  university: "lu",
  groupId: "26R-21023-PLK-1",
  events: parseLuEvents(readFixture(LU.chrono)),
  covered: [{ from: "2026-09-28", to: "2026-10-25" }],
  fetchedAt: "2026-10-12T08:00:00.000Z",
};

describe("slotsOf", () => {
  const slots = UNIVERSITY_SLOTS.lu;

  it("places an event in the slots it overlaps", () => {
    expect(slotsOf(slots, "10:30", "12:00")).toEqual({ period: "2", span: 1 });
    expect(slotsOf(slots, "10:30", "14:00")).toEqual({ period: "2", span: 2 });
    // Touching the next slot's start is not overlapping it.
    expect(slotsOf(slots, "09:00", "10:30")).toEqual({ period: "1", span: 1 });
  });

  it("falls back to the nearest slot for an off-grid event", () => {
    expect(slotsOf(slots, "07:00", "08:00")).toEqual({ period: "1", span: 1 });
    expect(slotsOf(slots, "22:00", "23:00")).toEqual({ period: "7", span: 1 });
    expect(slotsOf(slots, "10:05", "10:05")).toEqual({ period: "2", span: 1 });
  });
});

describe("resolveUniversityDay", () => {
  it("is null outside what has been fetched", () => {
    expect(isCovered(rtu, "2026-11-02")).toBe(false);
    expect(resolveUniversityDay(rtu, "2026-11-02")).toBeNull();
  });

  it("resolves an RTU day into the app's ResolvedDay", () => {
    const day = resolveUniversityDay(rtu, "2026-10-01");
    expect(day).toMatchObject({
      date: "2026-10-01",
      weekday: "thu",
      classId: "38532",
      ttNum: "rtu:38532",
      building: "Ķīpsalas 6",
      buildings: ["Ķīpsalas 6"],
      notes: [],
      stale: false,
    });
    expect(day?.periods).toEqual(UNIVERSITY_SLOTS.rtu);
    const starts = day?.lessons.map((l) => l.start) ?? [];
    expect(starts).toEqual([...starts].sort());
    expect(day?.lessons.find((l) => l.start === "12:30")).toMatchObject({
      period: "3",
      span: 1,
      end: "14:05",
      subject: { id: "Ēku tipoloģija", name: "Ēku tipoloģija" },
      teachers: [{ name: "U.Bratuškins" }],
      rooms: [{ name: "Ķīp. 6-307" }],
      status: "normal",
      building: "Ķīpsalas 6",
      group: null,
    });
  });

  it("gives an empty, covered day no buildings and its institution as the fallback", () => {
    const day = resolveUniversityDay(rtu, "2026-10-04");
    expect(day?.lessons).toEqual([]);
    expect(day?.buildings).toEqual([]);
    expect(day?.building).toBe("RTU");
  });

  it("keeps cancelled LU events, marked", () => {
    const day = resolveUniversityDay(lu, "2026-10-23");
    expect(day?.lessons.filter((l) => l.status === "cancelled")).toHaveLength(2);
    expect(day?.lessons.find((l) => l.status === "cancelled")?.subject?.id).toBe("MateB043");
  });

  it("filters to one subgroup plus the whole group's events", () => {
    const all = lu.events.filter((e) => e.date === "2026-10-01");
    const day = resolveUniversityDay(lu, "2026-10-01", { subgroup: "fiziviens" });
    const expected = all.filter((e) => e.subgroup === null || e.subgroup === "fiziviens");
    expect(day?.lessons).toHaveLength(expected.length);
    expect(day?.lessons.every((l) => l.group === null || l.group === "fiziviens")).toBe(true);
  });

  it("lists LU subgroups and none for RTU", () => {
    expect(listUniversitySubgroups(lu)).toEqual(["fizicetri", "fizidivi", "fizitris", "fiziviens"]);
    expect(listUniversitySubgroups(rtu)).toEqual([]);
    expect(listUniversitySubgroups(null)).toEqual([]);
  });

  it("omits room and building when the source has none", () => {
    const bare: UniversityEvent = {
      id: "x",
      date: "2026-10-05",
      start: "08:15",
      end: "09:50",
      subject: "S",
      subjectCode: null,
      kind: null,
      lecturers: [],
      room: null,
      building: null,
      subgroup: null,
      cancelled: false,
    };
    const day = resolveUniversityDay({ ...rtu, events: [bare] }, "2026-10-05");
    expect(day?.lessons[0]?.rooms).toEqual([]);
    expect(day?.lessons[0]?.building).toBeUndefined();
    expect(day?.building).toBe("RTU");
  });
});
