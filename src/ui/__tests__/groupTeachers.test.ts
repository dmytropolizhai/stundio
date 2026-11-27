import { describe, expect, it } from "vitest";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";
import {
  availableTeacherBuildings,
  filterTeachers,
  groupTeachersByInitial,
  hasFormTeachers,
  teacherDisplayName,
  teacherInitial,
} from "@/ui/screens/teacher-picker/group-teachers.ts";

const teacher = (
  id: string,
  short: string,
  buildings: string[],
  formClassIds: string[] = [],
  name = short,
): TeacherOption => ({
  id,
  short,
  name,
  buildings,
  formClassIds,
});

describe("group-teachers", () => {
  const sample: TeacherOption[] = [
    teacher("1", "Alksne Santa", ["Galvenā ēka"], ["-10"]),
    teacher("2", "Ārgale Nora", ["TIC"]),
    teacher("3", "Bumanis Agris", ["TIC", "Galvenā ēka"], ["-12"]),
    teacher("4", "99 Unknown", ["TIC"]),
  ];

  it("extracts display names and alphabetical initials", () => {
    expect(teacherDisplayName(teacher("x", "", [], [], "  Vārds Uzvārds  "))).toBe("Vārds Uzvārds");
    expect(teacherInitial(sample[0]!)).toBe("A");
    expect(teacherInitial(sample[1]!)).toBe("Ā");
    expect(teacherInitial(sample[3]!)).toBe("#");
  });

  it("derives sorted unique buildings and detects form teachers", () => {
    expect(availableTeacherBuildings(sample)).toEqual(["Galvenā ēka", "TIC"]);
    expect(hasFormTeachers(sample)).toBe(true);
    expect(hasFormTeachers([sample[1]!])).toBe(false);
  });

  it("filters by diacritic-folded multi-word query, building, and form-teacher flag", () => {
    expect(filterTeachers(sample, "argale", null, false).map((t) => t.short)).toEqual([
      "Ārgale Nora",
    ]);
    expect(filterTeachers(sample, "agris bumanis", null, false).map((t) => t.short)).toEqual([
      "Bumanis Agris",
    ]);
    expect(filterTeachers(sample, "", "TIC", true).map((t) => t.short)).toEqual(["Bumanis Agris"]);
    expect(filterTeachers(sample, "", "Galvenā ēka", false).map((t) => t.short)).toEqual([
      "Alksne Santa",
      "Bumanis Agris",
    ]);
  });

  it("groups teachers by initial letter while preserving order", () => {
    expect(
      groupTeachersByInitial(sample).map((g) => [g.letter, g.items.map((t) => t.short)]),
    ).toEqual([
      ["A", ["Alksne Santa"]],
      ["Ā", ["Ārgale Nora"]],
      ["B", ["Bumanis Agris"]],
      ["#", ["99 Unknown"]],
    ]);
  });
});
