/**
 * Pure grouping and filtering helpers for the class selector matrix.
 *
 * RVT class codes follow `<department><year>[-<group>]` (e.g. `DP3-2`, `ATK1`, `A2-1`).
 * Keeping parsing and grouping pure makes the filter bar and department slabs deterministic
 * and easy to test without mounting React.
 */
import type { Building } from "@/lib/edupage";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";

export type ParsedClassCode = {
  department: string;
  year: string | null;
};

export type DepartmentGroup = {
  department: string;
  items: ClassOption[];
};

const CODE_RE = /^([\p{L}]+)(\d)?/u;

export const parseClassCode = (short: string): ParsedClassCode => {
  const match = CODE_RE.exec(short.trim());
  if (match === null) {
    return { department: "#", year: null };
  }
  return {
    department: (match[1] ?? "#").toUpperCase(),
    year: match[2] ?? null,
  };
};

export const availableYears = (classes: ClassOption[]): string[] => {
  const years = new Set<string>();
  for (const cls of classes) {
    const { year } = parseClassCode(cls.short);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => a.localeCompare(b, "lv", { numeric: true }));
};

export const availableBuildings = (classes: ClassOption[]): Building[] => {
  const buildings = new Set<Building>();
  for (const cls of classes) {
    for (const building of cls.buildings) {
      buildings.add(building);
    }
  }
  return [...buildings].sort((a, b) => a.localeCompare(b, "lv"));
};

export const filterClasses = (
  classes: ClassOption[],
  query: string,
  year: string | null,
  building: Building | null,
): ClassOption[] => {
  const needle = query.trim().toLowerCase();

  return classes.filter((cls) => {
    if (needle !== "") {
      const matchesQuery =
        cls.short.toLowerCase().includes(needle) || cls.name.toLowerCase().includes(needle);
      if (!matchesQuery) return false;
    }

    if (year !== null && parseClassCode(cls.short).year !== year) {
      return false;
    }

    if (building !== null && !cls.buildings.includes(building)) {
      return false;
    }

    return true;
  });
};

export const groupClassesByDepartment = (classes: ClassOption[]): DepartmentGroup[] => {
  const groups = new Map<string, ClassOption[]>();
  for (const cls of classes) {
    const { department } = parseClassCode(cls.short);
    const bucket = groups.get(department);
    if (bucket === undefined) {
      groups.set(department, [cls]);
    } else {
      bucket.push(cls);
    }
  }
  return [...groups.entries()].map(([department, items]) => ({ department, items }));
};
