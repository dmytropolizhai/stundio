import { describe, expect, it } from "vitest";
import {
  currentRtuSemester,
  fetchRtuEvents,
  fetchRtuGroups,
  monthsBetween,
  parseRtuCourses,
  parseRtuEvents,
  parseRtuGroups,
  parseRtuPrograms,
  parseRtuSemesters,
  parseRtuSubjects,
  rtuEventDate,
  splitRtuEventName,
} from "../rtu.ts";
import { createFakeUniversity, readFixture, readJsonFixture, RTU } from "./fixtures.ts";

const subjects = parseRtuSubjects(readJsonFixture(RTU.subjects));

describe("RTU catalogue", () => {
  it("reads the semester select, current one first-class", () => {
    const semesters = parseRtuSemesters(readFixture(RTU.index));
    expect(semesters.length).toBeGreaterThan(3);
    expect(currentRtuSemester(semesters)).toEqual({
      id: "31",
      label: "2026/2027 Rudens semestris (26/27-R)",
      current: true,
    });
    expect(currentRtuSemester([])).toBeNull();
    expect(currentRtuSemester([{ id: "1", label: "x", current: false }])?.id).toBe("1");
    expect(parseRtuSemesters("<html></html>")).toEqual([]);
  });

  it("flattens departments into programs", () => {
    const programs = parseRtuPrograms(readJsonFixture(RTU.programs));
    expect(programs.length).toBeGreaterThan(50);
    expect(programs[0]).toEqual({
      university: "rtu",
      id: "227",
      code: "RABA0",
      title: "Arhitektūra",
      faculty: "Arhitektūras un dizaina institūts",
      level: null,
    });
    expect(parseRtuPrograms(null)).toEqual([]);
    expect(parseRtuPrograms([1, { program: "x" }, { program: [null, { programId: 1 }] }])).toEqual(
      [],
    );
  });

  it("labels groups by program code, course and group", () => {
    const [program] = parseRtuPrograms(readJsonFixture(RTU.programs));
    if (program === undefined) throw new Error("no program");
    expect(parseRtuGroups(readJsonFixture(RTU.groups), program)).toEqual([
      { university: "rtu", id: "38532", label: "RABA0 · 1. k. · 1. gr.", program: "Arhitektūra" },
      { university: "rtu", id: "38536", label: "RABA0 · 1. k. · 2. gr.", program: "Arhitektūra" },
    ]);
    expect(parseRtuGroups([{ semesterProgramId: 9, course: 2, group: 3 }], program)[0]?.label).toBe(
      "RABA0 · 2. k. · 3. gr.",
    );
    expect(parseRtuGroups([null, { semesterProgramId: 1 }], program)).toEqual([]);
    expect(parseRtuGroups("x", program)).toEqual([]);
    expect(parseRtuCourses([1, 2, "x"])).toEqual([1, 2]);
    expect(parseRtuCourses({})).toEqual([]);
    expect(parseRtuSubjects("x")).toEqual([]);
  });
});

describe("RTU events", () => {
  it("reads the calendar day in Riga time, not UTC", () => {
    // 2026-09-30T21:00:00Z is midnight 1 October in Riga.
    expect(rtuEventDate(1790802000000)).toBe("2026-10-01");
  });

  it("splits the kind, subject and lecturers out of the event name", () => {
    expect(
      splitRtuEventName(
        "Lekc, Pr.d. Arhitektūras projektēšanas darbnīca I, I.Dirveiks, A.Koroļova",
        "I.Dirveiks, A.Koroļova",
        [],
      ),
    ).toEqual({ kind: "Lekc, Pr.d.", subject: "Arhitektūras projektēšanas darbnīca I" });
    // The group's own subject list wins.
    expect(splitRtuEventName("Lekc. Ēku tipoloģija, U.Bratuškins", null, subjects)).toEqual({
      kind: "Lekc.",
      subject: "Ēku tipoloģija",
    });
    expect(splitRtuEventName("Vieslekcija", null, [])).toEqual({
      kind: null,
      subject: "Vieslekcija",
    });
  });

  it("parses the month fixture", () => {
    const events = parseRtuEvents(readJsonFixture(RTU.events), subjects);
    expect(events).toHaveLength(39);
    const first = events.find((e) => e.id === "1740454_108536");
    expect(first).toEqual({
      id: "1740454_108536",
      date: "2026-10-01",
      start: "12:30",
      end: "14:05",
      subject: "Ēku tipoloģija",
      subjectCode: null,
      kind: "Lekc.",
      lecturers: ["U.Bratuškins"],
      room: "Ķīp. 6-307",
      building: "Ķīpsalas 6",
      subgroup: null,
      cancelled: false,
    });
    expect(events.every((e) => !e.cancelled)).toBe(true);
  });

  it("drops rows it cannot place rather than throwing", () => {
    expect(parseRtuEvents("x", [])).toEqual([]);
    expect(
      parseRtuEvents(
        [
          null,
          { eventTempName: "A" },
          {
            eventTempName: "Lekc. B",
            eventDate: 1790802000000,
            customStart: { hour: 8, minute: 15 },
            customEnd: { hour: 9, minute: 50 },
            room: null,
            lecturerInfoText: null,
          },
        ],
        [],
      ),
    ).toMatchObject([{ subject: "B", room: null, building: null, lecturers: [], start: "08:15" }]);
  });

  it("lists the months a range touches", () => {
    expect(monthsBetween("2026-10-26", "2026-11-08")).toEqual([
      [2026, 10],
      [2026, 11],
    ]);
    expect(monthsBetween("2026-12-28", "2027-01-10")).toEqual([
      [2026, 12],
      [2027, 1],
    ]);
  });

  it("fetches subjects, then each month, keeping only the range", async () => {
    const fake = createFakeUniversity();
    const events = await fetchRtuEvents(fake.http, "38532", "2026-09-28", "2026-10-11");
    expect(fake.requests.map((r) => [new URL(r.url).pathname, r.form?.["month"]])).toEqual([
      ["/getSemProgSubjects", undefined],
      ["/getSemesterProgEventList", "9"],
      ["/getSemesterProgEventList", "10"],
    ]);
    expect(fake.requests.every((r) => r.method === "POST")).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.date >= "2026-09-28" && e.date <= "2026-10-11")).toBe(true);
  });

  it("fetches a program's groups course by course", async () => {
    const fake = createFakeUniversity();
    const [program] = parseRtuPrograms(readJsonFixture(RTU.programs));
    if (program === undefined) throw new Error("no program");
    const groups = await fetchRtuGroups(fake.http, "31", program);
    expect(groups.map((g) => g.id)).toEqual(["38532", "38536"]);
    expect(fake.requests[1]?.form).toEqual({ courseId: "1", semesterId: "31", programId: "227" });
  });
});
