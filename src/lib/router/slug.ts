/**
 * Slug encoding and matching-key normalisation for class and teacher URLs.
 *
 * - Class shorts (`"DP2-1"`) become lowercase ASCII slugs (`"dp2-1"`).
 * - EduPage stores teachers as `"Surname Name"` (`"Bumanis Agris"`), so `toTeacherSlug`
 *   moves the leading surname to the end (`"agris-bumanis"`).
 * - Matching uses `teacherSlugKey` (ASCII-folded, token-sorted), so both `"agris-bumanis"`
 *   and `"bumanis-agris"` — with or without Latvian diacritics — resolve to the same teacher.
 */

/** Strips diacritics via Unicode NFD decomposition (e.g. `ā` → `a`, `ķ` → `k`, `š` → `s`). */
const foldAscii = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Turns any display label into a clean lowercase ASCII URL slug. */
export const toSlug = (label: string): string =>
  foldAscii(label)
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Formats an EduPage teacher label (`"Surname Name"` or `"Surname First Middle"`) into a
 * natural `"name-surname"` URL slug (`"Bumanis Agris"` → `"agris-bumanis"`).
 */
export const toTeacherSlug = (label: string): string => {
  const tokens = label.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return toSlug(label);
  const [surname, ...given] = tokens;
  return toSlug([...given, surname].join(" "));
};

/**
 * Word-order-insensitive, diacritic-insensitive matching key for teacher names and slugs.
 * Mirrors `lib/edupage`'s `teacherKey`, extended with ASCII folding so plain-ASCII URLs
 * match Latvian names (`"kaspars-baldins"` ↔ `"Baldiņš Kaspars"`).
 */
export const teacherSlugKey = (input: string): string =>
  foldAscii(input)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
