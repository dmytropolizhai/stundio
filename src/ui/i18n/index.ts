/**
 * Chrome is translated (LV/EN/RU); anything the school wrote is not (CLAUDE.md) — the
 * substitution `raw` string is rendered verbatim behind a "from school" label.
 */
import { useCallback } from "react";
import { useAppStore } from "@/store";
import { lv, type Dict, type MessageKey } from "./lv.ts";
import { en } from "./en.ts";
import { ua } from "./ua.ts";
import { ru } from "./ru.ts";
import { lt } from "./lt.ts";
import { et } from "./et.ts";
import { pl } from "./pl.ts";
import { de } from "./de.ts";
import { fr } from "./fr.ts";
import { es } from "./es.ts";
import { it } from "./it.ts";
import { pt } from "./pt.ts";
import { nl } from "./nl.ts";
import { sv } from "./sv.ts";
import { fi } from "./fi.ts";
import { no } from "./no.ts";
import { da } from "./da.ts";
import { cs } from "./cs.ts";
import { sk } from "./sk.ts";
import { hu } from "./hu.ts";
import type { Lang } from "./format.ts";

export const DICTS: Record<Lang, Dict> = {
  lv,
  en,
  ua,
  ru,
  lt,
  et,
  pl,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  sv,
  fi,
  no,
  da,
  cs,
  sk,
  hu,
};
export const LANGS = [
  "lv",
  "en",
  "ua",
  "ru",
  "lt",
  "et",
  "pl",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "sv",
  "fi",
  "no",
  "da",
  "cs",
  "sk",
  "hu",
] as const;
export const LANG_NAMES: Record<Lang, string> = {
  lv: "Latviešu",
  en: "English",
  ua: "Українська",
  ru: "Русский",
  lt: "Lietuvių",
  et: "Eesti",
  pl: "Polski",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
  fi: "Suomi",
  no: "Norsk",
  da: "Dansk",
  cs: "Čeština",
  sk: "Slovenčina",
  hu: "Magyar",
};

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/** `{n}`-style interpolation. Deliberately not a plural engine: no message needs one yet. */
export const translate = (
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
) => {
  const message = DICTS[lang][key];
  if (params === undefined) return message;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
};

export const useLang = (): Lang => useAppStore((s) => s.settings.lang);

export const useT = (): Translate => {
  const lang = useLang();
  return useCallback<Translate>((key, params) => translate(lang, key, params), [lang]);
};

export type { Dict, MessageKey } from "./lv.ts";
export type { Lang } from "./format.ts";
export { CHANGELOG, type ChangelogEntry } from "./changelog.ts";
export {
  formatClock,
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatRange,
  formatReleaseDate,
  formatShortDate,
  formatWeekdayLong,
  formatWeekdayShort,
  formatWeekRange,
  localeTag,
} from "./format.ts";
