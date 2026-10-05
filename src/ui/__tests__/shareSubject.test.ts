/**
 * Whose week a share card names, per role. The regression: `selectedClassId` outlives a switch
 * to teacher mode, and the card used to read it directly — so a teacher's shared week was titled
 * with a class they had once picked as a student.
 */
import { describe, expect, it } from "vitest";
import { bootHarness, classIdOf } from "./harness.tsx";
import { resolveIdentity } from "@/lib/persona";
import { resolveShareSubject } from "../share/subject.ts";

const settingsOf = (overrides: Parameters<typeof resolveIdentity>[0]) => resolveIdentity(overrides);

const base = {
  persona: "student",
  selectedClassId: null,
  subgroup: null,
  selectedTeacherId: null,
  teacherView: "own",
} as const;

describe("resolveShareSubject", () => {
  it("names a student's class and credits its form teacher", async () => {
    const { store } = await bootHarness();
    const timetables = Object.values(store.getState().timetables);
    const classId = classIdOf(store, "A1-2");

    const subject = resolveShareSubject(
      settingsOf({ ...base, selectedClassId: classId }),
      timetables,
    );

    expect(subject?.label).toBe("A1-2");
    expect(subject?.classTeacher).not.toBeNull();
  });

  it("names a teacher by their own name, ignoring a leftover student class", async () => {
    const { store } = await bootHarness();
    const timetables = Object.values(store.getState().timetables);
    const teacher = timetables.flatMap((t) => t.teachers).find((t) => (t.short || t.name) !== "");
    if (teacher === undefined) throw new Error("fixture has no teachers");

    const subject = resolveShareSubject(
      settingsOf({
        ...base,
        persona: "teacher",
        selectedClassId: classIdOf(store, "A1-2"),
        selectedTeacherId: teacher.id,
      }),
      timetables,
    );

    expect(subject?.label).toBe(teacher.short || teacher.name);
    expect(subject?.label).not.toBe("A1-2");
    expect(subject?.classTeacher).toBeNull();
  });

  it("names the class a form teacher's form-class view shows", async () => {
    const { store } = await bootHarness();
    const timetables = Object.values(store.getState().timetables);
    const cls = timetables.flatMap((t) => t.classes).find((c) => c.teacherId !== null);
    if (cls?.teacherId == null) throw new Error("fixture has no form teacher");

    const subject = resolveShareSubject(
      settingsOf({
        ...base,
        persona: "teacher",
        selectedTeacherId: cls.teacherId,
        teacherView: "form-class",
      }),
      timetables,
    );

    expect(subject?.label).toBe(cls.short);
  });

  it("has nothing to share until the role's selection is made", async () => {
    const { store } = await bootHarness();
    const timetables = Object.values(store.getState().timetables);

    expect(
      resolveShareSubject(settingsOf({ ...base, selectedClassId: null }), timetables),
    ).toBeNull();
    expect(
      resolveShareSubject(
        settingsOf({ ...base, persona: "teacher", selectedClassId: classIdOf(store, "A1-2") }),
        timetables,
      ),
    ).toBeNull();
  });
});
