import { describe, expect, it } from "vitest";
import {
  coverDuties,
  listTeachers,
  normalizeTimetable,
  parseDaySubstitutions,
  resolveTeacherDay,
} from "../index.ts";
import { FIXTURES, FIXTURE_DATE, FIXTURE_TT_NUM, readFixture, readJsonFixture } from "./fixtures.ts";
import type { RawTables } from "../normalize.ts";

describe("resolveTeacherDay", () => {
  const raw = readJsonFixture<{
    r: { dbiAccessorRes: { tables: Array<{ id: string; data_rows?: Record<string, unknown>[] }> } };
  }>(FIXTURES.regulartt);
  const tables: RawTables = Object.fromEntries(
    raw.r.dbiAccessorRes.tables.map((t) => [t.id, t.data_rows ?? []]),
  );
  const { timetable } = normalizeTimetable(tables, {
    ttNum: FIXTURE_TT_NUM,
    building: "Galvenā ēka",
    validFrom: "2026-09-07",
    validTo: "2026-09-11",
    label: "Galvenā ēka 07.09.2026.",
    schoolYear: 2026,
    fetchedAt: "2026-09-09T00:00:00.000Z",
  });

  const subs = parseDaySubstitutions(
    readFixture(FIXTURES.substHtml),
    FIXTURE_DATE,
    "2026-09-09T00:00:00.000Z",
  );

  const teacherByName = (nameSubstr: string) => {
    const found = timetable.teachers.find((t) => t.short.includes(nameSubstr));
    expect(found, `Expected teacher containing "${nameSubstr}" to exist`).toBeDefined();
    return found!;
  };

  it("listTeachers: lists exactly 116 teaching staff members, omitting unplaced staff", () => {
    const teachers = listTeachers([timetable]);
    expect(teachers.length).toBe(116);
    expect(teachers.every((t) => t.short.length > 0)).toBe(true);

    // Sorted by Latvian locale
    const shorts = teachers.map((t) => t.short);
    const sorted = [...shorts].sort((a, b) => a.localeCompare(b, "lv"));
    expect(shorts).toEqual(sorted);

    // Form teachers preserve formClassIds
    const formTeachers = teachers.filter((t) => t.formClassIds.length > 0);
    expect(formTeachers.length).toBeGreaterThan(50);
  });

  it("property test: no teacher ever holds two lessons in one slot across all days", () => {
    let slotCollisions = 0;
    const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;

    for (const teacher of timetable.teachers) {
      for (const day of weekdays) {
        const slots = new Set<number>();
        for (const lesson of timetable.lessons) {
          if (lesson.teacherIds.includes(teacher.id) && lesson.day === day) {
            const start = Number(lesson.period);
            for (let i = 0; i < lesson.periodSpan; i++) {
              const slot = start + i;
              if (slots.has(slot)) {
                slotCollisions++;
              }
              slots.add(slot);
            }
          }
        }
      }
    }

    expect(slotCollisions).toBe(0);
  });

  it("resolves busiest teacher on 2026-09-09 with sorted periods and no duplicate slots", () => {
    const rusele = teacherByName("Rusele Lauma");
    const day = resolveTeacherDay(timetable, subs, rusele.id, FIXTURE_DATE);

    expect(day.teacherId).toBe(rusele.id);
    expect(day.lessons.length).toBe(11);

    // Sorted strictly ascending by period
    const periods = day.lessons.map((l) => Number(l.period));
    expect(periods).toEqual([...periods].sort((a, b) => a - b));

    // Zero duplicate starting periods
    expect(new Set(periods).size).toBe(periods.length);
  });

  it("merges parallel classes onto one card", () => {
    // Find a lesson where a teacher teaches multiple classes (e.g. KT2 + BG2)
    const multiClassLesson = timetable.lessons.find(
      (l) => l.classIds.length > 1 && l.teacherIds.length > 0,
    );
    expect(multiClassLesson).toBeDefined();

    const weekdayDates: Record<string, string> = {
      mon: "2026-09-07",
      tue: "2026-09-08",
      wed: "2026-09-09",
      thu: "2026-09-10",
      fri: "2026-09-11",
    };
    const targetDate = weekdayDates[multiClassLesson!.day] ?? "2026-09-08";

    const teacherId = multiClassLesson!.teacherIds[0]!;
    const day = resolveTeacherDay(timetable, null, teacherId, targetDate);

    const match = day.lessons.find((l) => l.period === multiClassLesson!.period);
    expect(match).toBeDefined();
    expect(match?.classes?.length).toBeGreaterThanOrEqual(2);
  });


  it("flags cover duty on teacher who was assigned to cover another class", () => {
    const geislers = teacherByName("Geislers Edgars");
    const day = resolveTeacherDay(timetable, subs, geislers.id, FIXTURE_DATE);

    // Period 2 was a cover for Liene Elizabete Čakste in class A1-2
    const coverLesson = day.lessons.find((l) => l.period === "2");
    expect(coverLesson).toBeDefined();
    expect(coverLesson?.isCover).toBe(true);
    expect(coverLesson?.role).toBe("cover");
    expect(coverLesson?.classes?.[0]?.short).toBe("A1-2");
    expect(coverLesson?.coverFor?.short).toBe("Čakste Liene Elizabete");

    // Other periods are own regular lessons
    const p3 = day.lessons.find((l) => l.period === "3");
    expect(p3).toBeDefined();
    expect(p3?.isCover).toBeFalsy();
    expect(p3?.role).toBe("own");

    // coverDuties helper returns the assignment
    const duties = coverDuties(subs, geislers.id, [timetable]);
    expect(duties.length).toBe(1);
    expect(duties[0]?.className).toBe("A1-2");
  });

  it("marks lessons as substituted/cancelled when teacher is replaced or lesson dropped", () => {
    const cakste = teacherByName("Čakste Liene Elizabete");
    const day = resolveTeacherDay(timetable, subs, cakste.id, FIXTURE_DATE);

    // Period 1 was cancelled
    const p1 = day.lessons.find((l) => l.period === "1");
    expect(p1).toBeDefined();
    expect(p1?.status).toBe("cancelled");

    // Period 2 was covered by Edgars Geislers
    const p2 = day.lessons.find((l) => l.period === "2");
    expect(p2).toBeDefined();
    expect(p2?.status).toBe("substituted");
  });
});
