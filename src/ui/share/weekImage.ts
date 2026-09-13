/**
 * Turns a resolved school week into the domain-free card `lib/share` knows how to paint.
 *
 * Everything language- or design-shaped is decided here: weekday names come from `Intl`, subject
 * codes and accents from `ui/theme` (so a subject is the same colour on the card as on screen),
 * and every label is already translated — the painter only places strings.
 */
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { weekPeriods } from "@/lib/schedule";
import type { ShareCell, ShareImageData } from "@/lib/share";
import { buildingNotice, lessonBuilding, subjectCode, subjectTone } from "@/ui/theme";
import {
  formatDayMonth,
  formatWeekdayShort,
  formatWeekRange,
  type Lang,
  type Translate,
} from "@/ui/i18n";
import type { ShareTheme } from "./palette.ts";

/** Where a reader of the shared image gets the app. Also the text that rides with the share. */
const RELEASES_URL = "https://github.com/dmytropolizhai/stundio/releases";
const RELEASES_LABEL = "github.com/dmytropolizhai/stundio/releases";

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

  // `slot.period` stays the raw source key ("1") for matching lessons; only the drawn label
  // is localized, so a period is never looked up by the string a translator chose.
  const rows = weekPeriods(days).map((slot) => ({
    period: t("share.image.period", { n: slot.period }),
    start: slot.start,
    end: slot.end,
    cells: days.map((day) => {
      const lesson = day?.lessons.find((l) => l.period === slot.period);
      return day === null || lesson === undefined ? null : toCell(day, lesson, theme);
    }),
  }));

  return {
    eyebrow: t("share.image.eyebrow"),
    className,
    period: first === undefined || last === undefined ? "" : formatWeekRange(first, last, lang),
    classTeacher:
      classTeacher === null ? null : { label: t("share.image.classTeacher"), name: classTeacher },
    columns: dates.map((date) => ({
      weekday: formatWeekdayShort(date, lang),
      date: formatDayMonth(date, lang),
    })),
    rows,
    notes: buildingNotes(dates, days, lang, t),
    brand: t("app.title"),
    link: RELEASES_LABEL,
  };
};

/** The message the image travels with — the school week in words, plus where to get the app. */
export const weekShareText = (className: string, period: string, t: Translate): string =>
  `${t("share.message", { class: className, period })}\n${RELEASES_URL}`;

/** `stundio-A1-2-2026-09-07.png` — a name that still means something in a downloads folder. */
export const weekShareFileName = (className: string, monday: ISODate | undefined): string => {
  const slug = className.replace(/[^\p{L}\p{N}-]+/gu, "-").toLowerCase();
  return `stundio-${slug}-${monday ?? "week"}.png`;
};
