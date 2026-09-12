/**
 * Chrome is translated (LV/EN/RU); anything the school wrote is not (CLAUDE.md) — the
 * substitution `raw` string is rendered verbatim behind a "from school" label.
 */
import { useCallback } from "react";
import { useAppStore } from "@/store";
import { lv, type Dict, type MessageKey } from "./lv.ts";
import { en } from "./en.ts";
import { ru } from "./ru.ts";
import { ua } from "./ua.ts";
import type { Lang } from "./format.ts";

export const DICTS: Record<Lang, Dict> = { lv, en, ru, ua };
export const LANGS = ["lv", "en", "ru", "ua"] as const;
export const LANG_NAMES: Record<Lang, string> = {
  lv: "Latviešu",
  en: "English",
  ru: "Русский",
  ua: "Солов'їна",
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
export {
  formatClock,
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatRange,
  formatWeekdayLong,
  formatWeekdayShort,
  formatWeekRange,
  localeTag,
} from "./format.ts";
