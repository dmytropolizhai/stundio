/*
 * Latvian text that stays Latvian inside the RU/EN/UA pages: school-written lesson names, the
 * building names and the school's own name. Screen readers switch voice on `lang`, so on those
 * pages the fragments are wrapped in `<span lang="lv">`. Visible text only — aria-labels cannot
 * carry markup.
 */
import { escapeHtml, raw, type Html } from "../html.ts";
import type { Lang } from "./index.ts";

/** Longest first, so "Rīgas Valsts tehnikum" wins over any shorter overlap. */
export const LATVIAN_FRAGMENTS: readonly string[] = [
  "Rīgas Valsts tehnikums",
  "Rīgas Valsts tehnikum",
  "Programmēšana",
  "Angļu valoda",
  "Matemātika",
  "Galvenā ēka",
];

const PATTERN = new RegExp(
  LATVIAN_FRAGMENTS.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "g",
);

/** Escaped `text`, with each known Latvian fragment marked up unless the page is Latvian itself. */
export const withLatvian = (text: string, lang: Lang): Html => {
  const safe = escapeHtml(text);
  return raw(lang === "lv" ? safe : safe.replace(PATTERN, (m) => `<span lang="lv">${m}</span>`));
};
