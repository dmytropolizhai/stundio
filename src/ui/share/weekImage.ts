/**
 * Turns a resolved school week into the domain-free card `lib/share` knows how to paint.
 *
 * Everything language- or design-shaped is decided here: weekday names come from `Intl`, subject
 * codes and accents from `ui/theme` (so a subject is the same colour on the card as on screen),
 * and every label is already translated — the painter only places strings.
 */
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { weekPeriods } from "@/lib/schedule";
import {
  encodeQr,
  type ShareCell,
  type ShareImageData,
  type ShareLegendEntry,
  type ShareLink,
} from "@/lib/share";
import { buildingNotice, lessonBuilding, subjectCode, subjectTone } from "@/ui/theme";
import {
  formatDayMonth,
  formatWeekdayShort,
  formatWeekRange,
  type Lang,
  type Translate,
} from "@/ui/i18n";
import type { ShareTheme } from "./palette.ts";

/**
 * Where a reader of the shared image gets the app.
 *
 * The card carries the short link because it has to survive being scanned *and* typed out by
 * hand, and because a QR of the full releases URL is a denser symbol for no gain. The message
 * that travels beside the image carries the real URL, where it is a tappable link and length
 * costs nothing.
 */
const APP_URL = "github.com/dmytropolizhai/stundio";
/**
 * The "get the app" block: a scannable code plus the same address in words.
 *
 * Both, not either — the likeliest reader is looking at this on the very phone that would do
 * the scanning, and a camera cannot read its own screen. The code is generated on the device
 * (`encodeQr`); if a URL ever outgrows what that encoder handles, the card silently keeps the
 * words and drops the square rather than failing to render at all.
 */
const appLink = (t: Translate): ShareLink => {
  const label = t("share.image.appLabel");
  try {
    return { label, qr: encodeQr(APP_URL) };
  } catch {
    return { label, qr: null };
  }
};

export type WeekImageInput = {
  dates: ISODate[];
  /** One entry per date, `null` where nothing is cached — same shape the week view renders. */
  days: (ResolvedDay | null)[];
  className: string;
  /** Form teacher's name, or `null` when the school publishes none for this class. */
  classTeacher: string | null;
  theme: ShareTheme;
  lang: Lang;
  t: Translate;
};

const roomsOf = (lesson: ResolvedLesson): string =>
  lesson.rooms
    .map((room) => room.short)
    .filter((short) => short !== "")
    .join(", ");

const toCell = (day: ResolvedDay, lesson: ResolvedLesson, theme: ShareTheme): ShareCell => {
  const tone = theme.tones[subjectTone(lesson.subject)];
  const detail = roomsOf(lesson);
  const building = lessonBuilding(day, lesson);

  return {
    label: subjectCode(lesson.subject),
    fill: tone.fill,
    ink: tone.ink,
    ...(detail === "" ? {} : { detail }),
    ...(building === undefined ? {} : { outlined: true }),
    ...(lesson.status === "cancelled" ? { cancelled: true } : {}),
  };
};

/**
 * The key to the grid's codes: every subject the week uses, once, with its full name.
 *
 * `subjectCode` derives a three-letter code because RVT publishes no short one and a 40pt cell
 * holds nothing longer — which is fine in the app, where the lesson is one tap from its full
 * name, and useless on an image, where there is nothing to tap. Sorted by code so a reader
 * scanning from a cell finds the line quickly.
 */
const subjectKey = (days: (ResolvedDay | null)[], theme: ShareTheme): ShareLegendEntry[] => {
  const byLabel = new Map<string, ShareLegendEntry>();

  for (const day of days) {
    for (const lesson of day?.lessons ?? []) {
      const label = subjectCode(lesson.subject);
      const name = (lesson.subject?.name ?? lesson.subject?.short ?? "").trim();

      // Nothing to explain when there is no name behind the code.
      if (name === "" || name === label || byLabel.has(label)) continue;

      const tone = theme.tones[subjectTone(lesson.subject)];
      byLabel.set(label, { label, name, fill: tone.fill, ink: tone.ink });
    }
  }

  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label, "lv"));
};

/**
 * Which weekdays sit in another building, as one line per building — the same sentence the week
 * view prints under its grid. On a card that someone screenshots and forgets the origin of, this
 * is the difference between "Tuesday, room 12" and "Tuesday, the other side of town".
 */
const buildingNotes = (
  dates: ISODate[],
  days: (ResolvedDay | null)[],
  lang: Lang,
  t: Translate,
): string[] => {
  const byBuilding = new Map<string, string[]>();

  days.forEach((day, i) => {
    const date = dates[i];
    if (day === null || date === undefined) return;

    for (const building of buildingNotice(day) ?? []) {
      byBuilding.set(building, [
        ...(byBuilding.get(building) ?? []),
        formatWeekdayShort(date, lang),
      ]);
    }
  });

  return [...byBuilding.entries()].map(([building, weekdays]) =>
    t("week.buildingDays", { building, days: weekdays.join(", ") }),
  );
};

export const buildWeekImageData = ({
  dates,
  days,
  className,
  classTeacher,
  theme,
  lang,
  t,
}: WeekImageInput): ShareImageData => {
  const first = dates[0];
  const last = dates[dates.length - 1];

  const rows = weekPeriods(days).map((slot) => ({
    period: slot.period,
    start: slot.start,
    end: slot.end,
    cells: days.map((day) => {
      const lesson = day?.lessons.find((l) => l.period === slot.period);
      return day === null || lesson === undefined ? null : toCell(day, lesson, theme);
    }),
  }));

  return {
    className,
    period: first === undefined || last === undefined ? "" : formatWeekRange(first, last, lang),
    classTeacher:
      classTeacher === null ? null : { label: t("share.image.classTeacher"), name: classTeacher },
    columns: dates.map((date) => ({
      weekday: formatWeekdayShort(date, lang),
      date: formatDayMonth(date, lang),
    })),
    rows,
    legend: subjectKey(days, theme),
    notes: buildingNotes(dates, days, lang, t),
    brand: t("app.title"),
    link: appLink(t),
  };
};

/** The message the image travels with — the school week in words, plus where to get the app. */
export const weekShareText = (className: string, period: string, t: Translate): string =>
  `${t("share.message", { class: className, period })}\n`;

/** `stundio-A1-2-2026-09-07.png` — a name that still means something in a downloads folder. */
export const weekShareFileName = (className: string, monday: ISODate | undefined): string => {
  const slug = className.replace(/[^\p{L}\p{N}-]+/gu, "-").toLowerCase();
  return `stundio-${slug}-${monday ?? "week"}.png`;
};
