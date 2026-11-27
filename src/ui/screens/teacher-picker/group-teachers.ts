/**
 * Pure grouping and filtering helpers for the teacher selector slabs.
 *
 * RVT teachers arrive as `"Surname Firstname"` strings with Latvian diacritics, one or more
 * buildings, and optional form-class assignments. Keeping normalization, filtering, and A–Z
 * bucketing pure makes the picker deterministic and testable without mounting React.
 */
import type { Building } from "@/lib/edupage";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";

export type TeacherInitialGroup = {
  letter: string;
  items: TeacherOption[];
};

const DIACRITIC_RE = /\p{Diacritic}/gu;
const LETTER_RE = /\p{L}/u;

export const teacherDisplayName = (teacher: TeacherOption): string =>
  (teacher.short || teacher.name).trim();

const foldText = (value: string): string =>
  value.normalize("NFD").replace(DIACRITIC_RE, "").toLowerCase();

export const teacherInitial = (teacher: TeacherOption): string => {
  const name = teacherDisplayName(teacher);
  const first = Array.from(name)[0];
  if (first === undefined || !LETTER_RE.test(first)) {
    return "#";
  }
  return first.toLocaleUpperCase("lv");
};

export const availableTeacherBuildings = (teachers: TeacherOption[]): Building[] => {
  const buildings = new Set<Building>();
  for (const teacher of teachers) {
    for (const building of teacher.buildings) {
      buildings.add(building);
    }
  }
  return [...buildings].sort((a, b) => a.localeCompare(b, "lv"));
};

export const hasFormTeachers = (teachers: TeacherOption[]): boolean =>
  teachers.some((teacher) => teacher.formClassIds.length > 0);

export const filterTeachers = (
  teachers: TeacherOption[],
  query: string,
  building: Building | null,
  formTeachersOnly: boolean,
): TeacherOption[] => {
  const tokens = foldText(query)
    .split(/\s+/)
    .filter((token) => token !== "");

  return teachers.filter((teacher) => {
    if (tokens.length > 0) {
      const haystack = foldText(`${teacher.short} ${teacher.name}`);
      if (!tokens.every((token) => haystack.includes(token))) {
        return false;
      }
    }

    if (building !== null && !teacher.buildings.includes(building)) {
      return false;
    }

    if (formTeachersOnly && teacher.formClassIds.length === 0) {
      return false;
    }

    return true;
  });
};

export const groupTeachersByInitial = (teachers: TeacherOption[]): TeacherInitialGroup[] => {
  const groups = new Map<string, TeacherOption[]>();
  for (const teacher of teachers) {
    const letter = teacherInitial(teacher);
    const bucket = groups.get(letter);
    if (bucket === undefined) {
      groups.set(letter, [teacher]);
    } else {
      bucket.push(teacher);
    }
  }
  return [...groups.entries()].map(([letter, items]) => ({ letter, items }));
};
