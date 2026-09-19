/**
 * Search + grouping for the "all school" change list. Pure and React-free so the
 * ordering rule (the user's own class first, everything else alphabetical) can be
 * tested without rendering.
 */
import type { Substitution } from "@/lib/edupage";

const matches = (item: Substitution, query: string): boolean =>
  item.className.toLowerCase().includes(query) ||
  (item.subject?.toLowerCase().includes(query) ?? false) ||
  (item.subjectFrom?.toLowerCase().includes(query) ?? false) ||
  (item.teacher?.toLowerCase().includes(query) ?? false) ||
  (item.teacherFrom?.toLowerCase().includes(query) ?? false) ||
  (item.room?.toLowerCase().includes(query) ?? false) ||
  item.raw.toLowerCase().includes(query);

export const groupSubstitutionsByClass = (
  items: readonly Substitution[],
  search: string,
  selectedClassShort: string | null,
): [string, Substitution[]][] => {
  const query = search.trim().toLowerCase();

  const groups = new Map<string, Substitution[]>();
  for (const item of items) {
    if (query !== "" && !matches(item, query)) continue;
    const list = groups.get(item.className) ?? [];
    list.push(item);
    groups.set(item.className, list);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (selectedClassShort !== null) {
      if (a === selectedClassShort) return -1;
      if (b === selectedClassShort) return 1;
    }
    return a.localeCompare(b);
  });
};
