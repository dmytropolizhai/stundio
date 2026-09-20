/**
 * Teacher name normalisation and lookup.
 *
 * EduPage publishes teacher names in two opposite orders:
 *   - Base timetable (regularttGetData): `teachers.short` is "Surname Name" ("Ķere Gene")
 *   - Substitutions feed (getSubstViewerDayDataHtml): prints "Name Surname" ("Gene Ķere")
 *
 * Normalising by lowercase + sorting name tokens alphabetically (Latvian locale) produces
 * a stable key ("gene ķere") that matches both formats losslessly while preserving diacritics.
 */
import type { TeacherRef } from "./types.ts";

/**
 * Normalises a teacher's display name or label into a token-sorted lowercase key.
 * Preserves Latvian diacritics and ignores extraneous whitespace or punctuation.
 *
 * Examples:
 *   - "Ķere Gene" -> "gene ķere"
 *   - "Gene Ķere" -> "gene ķere"
 *   - "Liene Elizabete Čakste" -> "čakste elizabete liene"
 */
export const teacherKey = (name: string | null | undefined): string => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token !== "")
    .sort((a, b) => a.localeCompare(b, "lv"))
    .join(" ");
};

/**
 * Builds a Map indexing teachers by their normalised name key.
 * Indexes both `short` and `name` properties of each TeacherRef.
 */
export const indexTeachersByKey = (
  teachers: readonly TeacherRef[],
  into: Map<string, TeacherRef> = new Map(),
): Map<string, TeacherRef> => {
  for (const t of teachers) {
    if (t.short !== "") into.set(teacherKey(t.short), t);
    if (t.name !== "") into.set(teacherKey(t.name), t);
  }
  return into;
};

/**
 * Looks up a teacher in a normalised index.
 */
export const lookupTeacher = (
  name: string,
  byKey: ReadonlyMap<string, TeacherRef>,
): TeacherRef | undefined => byKey.get(teacherKey(name));
