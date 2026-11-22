/**
 * Stage 1 of the calendar export: `ResolvedDay[]` → `CalendarEvent[]`. This is the only stage
 * that reads EduPage's resolved view model; the serializer and router see `CalendarEvent` only.
 * Pure and device-clock-free: dates are iterated as strings (Europe/Riga calendar dates), never
 * through device-local `Date` maths. It does no I/O and knows nothing about the target app.
 */
import {
  weekdayOf,
  type ISODate,
  type ResolvedDay,
  type ResolvedLesson,
  type ResolvedStatus,
  type TeacherResolvedLesson,
} from "@/lib/edupage";

import type { CalendarChange, CalendarEvent, CalendarLabels, ExportRange } from "./types.ts";

const CHANGE: Record<ResolvedStatus, CalendarChange> = {
  normal: "none",
  cancelled: "cancelled",
  moved: "moved",
  substituted: "substituted",
  room_change: "room_change",
  added: "added",
};

const MS_PER_DAY = 86_400_000;

/** Calendar-date step on the UTC axis: the string is a Riga date, so no zone ever applies. */
const nextDate = (date: ISODate): ISODate => {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return date;
  return new Date(Date.UTC(y, m - 1, d) + MS_PER_DAY).toISOString().slice(0, 10);
};

/**
 * Same convention as `ui/components/lesson-heading.ts` (lib must not import from ui/): a student
 * leads with the subject; a teacher with "group · room", the subject demoted to the description.
 */
const isTeacherLesson = (lesson: ResolvedLesson): boolean => {
  const t = lesson as Partial<TeacherResolvedLesson>;
  return (
    (t.classes !== undefined && t.classes.length > 0) ||
    t.role !== undefined ||
    lesson.isCover === true
  );
};

const subjectName = (lesson: ResolvedLesson): string =>
  lesson.subject?.name || lesson.subject?.short || lesson.group || "?";

const roomsOf = (lesson: ResolvedLesson): string => lesson.rooms.map((r) => r.short).join(", ");

const baseTitle = (lesson: ResolvedLesson): string => {
  if (!isTeacherLesson(lesson)) return subjectName(lesson);
  const classes = (lesson as Partial<TeacherResolvedLesson>).classes
    ?.map((c) => c.short || c.name)
    .join(" + ");
  const rooms = roomsOf(lesson);
  if (classes && rooms) return `${classes} · ${rooms}`;
  return classes || rooms || subjectName(lesson);
};

const titleOf = (lesson: ResolvedLesson, labels: CalendarLabels): string => {
  const title = baseTitle(lesson);
  if (lesson.status === "cancelled") return `⚠ ${title} (${labels.cancelled})`;
  if (lesson.status === "moved") return `↪ ${title} (${labels.moved})`;
  return title;
};

const STATUS_LABEL: Record<ResolvedStatus, keyof CalendarLabels | null> = {
  normal: null,
  cancelled: "cancelled",
  moved: "moved",
  substituted: "substituted",
  room_change: "roomChange",
  added: "added",
};

const names = (list: readonly { short: string; name: string }[]): string =>
  list.map((x) => x.name || x.short).join(", ");

const descriptionOf = (lesson: ResolvedLesson, labels: CalendarLabels): string => {
  const lines: string[] = [];
  const statusKey = STATUS_LABEL[lesson.status];
  if (statusKey !== null) lines.push(labels[statusKey]);
  if (isTeacherLesson(lesson)) lines.push(subjectName(lesson));
  if (lesson.teachers.length > 0) lines.push(`${labels.teachers}: ${names(lesson.teachers)}`);
  if (lesson.group) lines.push(`${labels.group}: ${lesson.group}`);

  const original = lesson.original;
  if (original && lesson.status !== "normal") {
    const bits = [
      original.subject ? original.subject.name || original.subject.short : "",
      original.teachers?.length ? names(original.teachers) : "",
      original.rooms?.length ? original.rooms.map((r) => r.short).join(", ") : "",
    ].filter((x) => x !== "");
    if (bits.length > 0) lines.push(`${bits.join(" · ")}`);
  }
  if (lesson.movedTo) {
    const period = lesson.movedTo.period ? ` (${lesson.movedTo.period})` : "";
    lines.push(`${labels.moved}: ${lesson.movedTo.date}${period}`);
  }
  // School-written: kept verbatim, never translated or trimmed of its own wording.
  if (lesson.changeNote) lines.push(`${labels.changeNote}: ${lesson.changeNote}`);
  return lines.join("\n");
};

/**
 * Stable across exports and distinct per subgroup: the group and subject are part of the key, so
 * two subgroups sharing a period do not overwrite each other in the user's calendar.
 */
const uidOf = (scope: string, date: ISODate, lesson: ResolvedLesson): string =>
  `${scope}-${date}-${lesson.period}-${lesson.group ?? "all"}-${lesson.subject?.id ?? "x"}@stundio`.replace(
    /[^A-Za-z0-9._@-]/g,
    "_",
  );

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const buildCalendarEvents = (
  days: ResolvedDay[],
  labels: CalendarLabels,
  scope: string,
): CalendarEvent[] => {
  const seen = new Map<string, number>();
  const events: CalendarEvent[] = [];
  for (const day of days) {
    for (const lesson of day.lessons) {
      let uid = uidOf(scope, day.date, lesson);
      // A vacated slot and its replacement can share period + subject; a suffix keeps both,
      // deterministically (input order is the resolver's period order).
      const n = (seen.get(uid) ?? 0) + 1;
      seen.set(uid, n);
      if (n > 1) uid = uid.replace(/@stundio$/, `-${n}@stundio`);
      const change = CHANGE[lesson.status];
      events.push({
        uid,
        date: day.date,
        start: lesson.start,
        end: lesson.end,
        title: titleOf(lesson, labels),
        location: roomsOf(lesson),
        description: descriptionOf(lesson, labels),
        change,
        sequence: change === "none" ? 0 : 1,
      });
    }
  }
  return events.sort(
    (a, b) => compare(a.date, b.date) || compare(a.start, b.start) || compare(a.uid, b.uid),
  );
};

export const eventsForRange = (
  range: ExportRange,
  resolve: (date: ISODate) => ResolvedDay | null,
  labels: CalendarLabels,
  scope: string,
): CalendarEvent[] => {
  const days: ResolvedDay[] = [];
  // ISO dates compare lexicographically; the guard also stops a malformed range from spinning.
  for (let date = range.from; date <= range.to; date = nextDate(date)) {
    const weekday = weekdayOf(date);
    if (weekday === "sat" || weekday === "sun") continue;
    const day = resolve(date);
    if (day) days.push(day);
  }
  return buildCalendarEvents(days, labels, scope);
};
