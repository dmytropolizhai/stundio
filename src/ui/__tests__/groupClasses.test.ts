import { describe, expect, it } from "vitest";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";
import {
  availableBuildings,
  availableYears,
  filterClasses,
  groupClassesByDepartment,
  parseClassCode,
} from "@/ui/screens/class-selector/group-classes.ts";

const cls = (id: string, short: string, buildings: string[]): ClassOption => ({
  id,
  short,
  name: short,
  buildings,
});

describe("group-classes", () => {
  const sample: ClassOption[] = [
    cls("1", "A1-1", ["Galvenā ēka"]),
    cls("2", "DP3-1", ["Galvenā ēka"]),
    cls("3", "DP3-2", ["TIC"]),
    cls("4", "DT4-1", ["TIC", "Galvenā ēka"]),
    cls("5", "99", ["TIC"]),
  ];

  it("parses department prefix and year digit", () => {
    expect(parseClassCode("DP3-2")).toEqual({ department: "DP", year: "3" });
    expect(parseClassCode("atk1")).toEqual({ department: "ATK", year: "1" });
    expect(parseClassCode("99")).toEqual({ department: "#", year: null });
  });

  it("derives sorted unique years and buildings", () => {
    expect(availableYears(sample)).toEqual(["1", "3", "4"]);
    expect(availableBuildings(sample)).toEqual(["Galvenā ēka", "TIC"]);
  });

  it("filters by search query, year, and building together", () => {
    expect(filterClasses(sample, "dp", "3", "TIC").map((c) => c.short)).toEqual(["DP3-2"]);
    expect(filterClasses(sample, "", null, "Galvenā ēka").map((c) => c.short)).toEqual([
      "A1-1",
      "DP3-1",
      "DT4-1",
    ]);
  });

  it("groups classes by department while preserving order", () => {
    expect(
      groupClassesByDepartment(sample).map((g) => [g.department, g.items.map((c) => c.short)]),
    ).toEqual([
      ["A", ["A1-1"]],
      ["DP", ["DP3-1", "DP3-2"]],
      ["DT", ["DT4-1"]],
      ["#", ["99"]],
    ]);
  });
});
