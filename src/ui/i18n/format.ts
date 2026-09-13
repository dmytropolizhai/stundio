/**
 * Locale formatting. Weekday and date names come from `Intl`, not from the dictionaries —
 * three hand-maintained weekday tables is three chances to be wrong, and the platform
 * already knows Latvian.
 */
import type { Settings } from "@/db";
import type { HHMM, ISODate } from "@/lib/edupage";

export type Lang = Settings["lang"];

const LOCALE: Record<Lang, string> = { lv: "lv-LV", en: "en-GB", ru: "ru-RU", ua: "ua-UA" };

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

/** "trešdiena" — the WeekView overview's busiest/lightest day line. */
export const formatWeekdayLong = (date: ISODate, lang: Lang): string =>
  fmt(lang, { weekday: "long" }).format(toDate(date));

/** "9. septembris 2026" — a release date in the what's-new sheet. No weekday: which day of
 * the week a release landed on is noise. */
export const formatReleaseDate = (date: ISODate, lang: Lang): string =>
  fmt(lang, { day: "numeric", month: "long", year: "numeric" }).format(toDate(date));

/** "9.09." — under the weekday in the pager. */
export const formatDayMonth = (date: ISODate, lang: Lang): string =>
  fmt(lang, { day: "numeric", month: "numeric" }).format(toDate(date));

/**
 * "07.09.–11.09." — the WeekView header title. Numeric rather than the spelled-out month
 * `formatLongDate` uses: it sits between two 44px arrow buttons in a single header row, and a
 * spelled-out month range does not fit a 375px phone next to the class/sync actions.
 */
export const formatWeekRange = (start: ISODate, end: ISODate, lang: Lang): string =>
  fmt(lang, { day: "2-digit", month: "2-digit" }).formatRange(toDate(start), toDate(end));

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
