/**
 * Locale formatting. Weekday and date names come from `Intl`, not from the dictionaries —
 * three hand-maintained weekday tables is three chances to be wrong, and the platform
 * already knows Latvian.
 */
import type { Settings } from "../../db/index.ts";
import type { HHMM, ISODate } from "../../lib/edupage/index.ts";

export type Lang = Settings["lang"];

const LOCALE: Record<Lang, string> = { lv: "lv-LV", en: "en-GB", ru: "ru-RU" };

/** BCP-47 tag for a `Lang` — for callers (the calendar popover) that hand a locale to `Intl`
 * themselves rather than going through one of this file's formatters. */
export const localeTag = (lang: Lang): string => LOCALE[lang];

/** Parsed as UTC noon: a date-only value has no timezone, and noon survives any DST shift. */
const toDate = (date: ISODate): Date => new Date(`${date}T12:00:00Z`);

const fmt = (lang: Lang, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE[lang], { ...options, timeZone: "UTC" });

/** "trešdiena, 9. septembris" — the DayView header. */
export const formatLongDate = (date: ISODate, lang: Lang): string =>
  fmt(lang, { weekday: "long", day: "numeric", month: "long" }).format(toDate(date));

/** "Tr" — the WeekView pager tabs. */
export const formatWeekdayShort = (date: ISODate, lang: Lang): string =>
  fmt(lang, { weekday: "short" }).format(toDate(date));

/** "9.09." — under the weekday in the pager. */
export const formatDayMonth = (date: ISODate, lang: Lang): string =>
  fmt(lang, { day: "numeric", month: "numeric" }).format(toDate(date));

/** Clock time for "updated 14:32". EduPage times are already local wall clock. */
export const formatClock = (at: string, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALE[lang], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Riga",
  }).format(new Date(at));

/** Minutes → "1 h 20 min" for gaps between lessons; short forms stay language-neutral. */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** "08:30 – 09:10". */
export const formatRange = (start: HHMM, end: HHMM): string =>
  start === "" ? "" : `${start} – ${end}`;
