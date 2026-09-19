import { describe, expect, it } from "vitest";
import type { Substitution } from "@/lib/edupage";
import { groupSubstitutionsByClass } from "../screens/changes-view/group-substitutions.ts";

const subst = (over: Partial<Substitution>): Substitution => ({
  date: "2026-09-09",
  className: "A1-1",
  group: null,
  periods: [1],
  isOriginalSlot: false,
  kind: "substitution",
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
  raw: "",
  ...over,
});

describe("groupSubstitutionsByClass", () => {
  it("groups items by class, alphabetically", () => {
    const groups = groupSubstitutionsByClass(
      [subst({ className: "B2-1" }), subst({ className: "A1-1" }), subst({ className: "B2-1" })],
      "",
      null,
    );

    expect(groups.map(([name]) => name)).toEqual(["A1-1", "B2-1"]);
    expect(groups[1]![1]).toHaveLength(2);
  });

  it("puts the selected class first, whatever the alphabet says", () => {
    const groups = groupSubstitutionsByClass(
      [subst({ className: "A1-1" }), subst({ className: "Z9-9" })],
      "",
      "Z9-9",
    );

    expect(groups.map(([name]) => name)).toEqual(["Z9-9", "A1-1"]);
  });

  it("matches the query against every searchable field, case-insensitively", () => {
    const items = [
      subst({ className: "A1-1", subject: "Matemātika" }),
      subst({ className: "B2-1", teacherFrom: "Ozols" }),
      subst({ className: "C3-1", room: "214" }),
      subst({ className: "D4-1", raw: "Aizvietots (Bērziņš)" }),
      subst({ className: "E5-1", subjectFrom: "Fizika" }),
    ];

    expect(groupSubstitutionsByClass(items, "matem", null).map(([n]) => n)).toEqual(["A1-1"]);
    expect(groupSubstitutionsByClass(items, "OZOLS", null).map(([n]) => n)).toEqual(["B2-1"]);
    expect(groupSubstitutionsByClass(items, "214", null).map(([n]) => n)).toEqual(["C3-1"]);
    expect(groupSubstitutionsByClass(items, "bērziņš", null).map(([n]) => n)).toEqual(["D4-1"]);
    expect(groupSubstitutionsByClass(items, "fizika", null).map(([n]) => n)).toEqual(["E5-1"]);
  });

  it("treats a blank or whitespace-only query as no filter", () => {
    const items = [subst({ className: "A1-1" }), subst({ className: "B2-1" })];

    expect(groupSubstitutionsByClass(items, "   ", null)).toHaveLength(2);
    expect(groupSubstitutionsByClass(items, "", null)).toHaveLength(2);
  });

  it("returns no groups when nothing matches", () => {
    expect(groupSubstitutionsByClass([subst({})], "xyznonexistent", null)).toEqual([]);
  });
});
