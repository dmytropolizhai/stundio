/*
 * Language registry for the landing: the four page languages, where each one lives, and a
 * typed lookup. Keys are typed against `lv.ts` (the source dictionary), so a key missing from
 * any other language is a compile error — and `pages.test.ts` checks it again at runtime.
 *
 * `ua` is the app's internal code for Ukrainian; the HTML language tag for it is `uk`.
 */
import { en } from "./en.ts";
import { lv, type Dict, type Key } from "./lv.ts";
import { ru } from "./ru.ts";
import { ua } from "./ua.ts";

export type { Key };
export type Lang = "lv" | "ru" | "en" | "ua";

export const LANGS: readonly Lang[] = ["lv", "ru", "en", "ua"];
export const DEFAULT_LANG: Lang = "lv";

export const DICTIONARIES: Record<Lang, Dict> = { lv, ru, en, ua };

/** Value for `<html lang>` and `hreflang`. */
export const HTML_LANG: Record<Lang, string> = { lv: "lv", ru: "ru", en: "en", ua: "uk" };

/** Every language's own name for itself — never a flag, never translated (01c section 3). */
export const LANG_NAMES: Record<Lang, string> = {
  lv: "Latviešu",
  ru: "Русский",
  en: "English",
  ua: "Українська",
};

/** Path of a language's page; Latvian owns the root (canonical, x-default). */
export const langPath = (lang: Lang): string => (lang === "lv" ? "/" : `/${lang}/`);

export type T = (key: Key) => string;
export type Ctx = { readonly lang: Lang; readonly t: T };

export const createCtx = (lang: Lang): Ctx => {
  const dict = DICTIONARIES[lang];
  return { lang, t: (key) => dict[key] };
};
