/**
 * A university group's day → the same `ResolvedDay` the EduPage path produces, so Home, Week,
 * Subjects, the widget and the share card render a university without knowing it is one.
 *
 * Universities publish real clock times, not period numbers. The week grid and the day list
 * are keyed by period, though, so each event is placed in the university's own fixed lesson
 * slots ("pāris"): the slots it overlaps give its period and span, and its own start/end are
 * kept as-is. A lecture running 10:30–14:00 at LU is period 2 spanning 2.
 */
import {
  weekdayOf,
  type HHMM,
  type ISODate,
  type Period,
  type ResolvedDay,
  type ResolvedLesson,
} from "@/lib/edupage";
import {
  UNIVERSITY_SHORT,
  type UniversityEvent,
  type UniversityId,
  type UniversitySchedule,
} from "./types.ts";

const slots = (times: [HHMM, HHMM][]): Period[] =>
  times.map(([start, end], i) => ({ period: String(i + 1), name: String(i + 1), start, end }));

/** The published lesson slots, verified against the 2026 autumn timetables. */
export const UNIVERSITY_SLOTS: Record<UniversityId, Period[]> = {
  rtu: slots([
    ["08:15", "09:50"],
    ["10:15", "11:50"],
    ["12:30", "14:05"],
    ["14:30", "16:05"],
    ["16:30", "18:05"],
    ["18:15", "19:50"],
    ["20:00", "21:35"],
  ]),
  lu: slots([
    ["08:30", "10:00"],
    ["10:30", "12:00"],
    ["12:30", "14:00"],
    ["14:30", "16:00"],
    ["16:30", "18:00"],
    ["18:15", "19:45"],
    ["20:00", "21:30"],
  ]),
};

const minutes = (t: HHMM): number => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** The slots an event covers: those it overlaps, or the nearest one when it overlaps none. */
export const slotsOf = (
  periods: readonly Period[],
  start: HHMM,
  end: HHMM,
): { period: string; span: number } => {
  const s = minutes(start);
  const e = Math.max(minutes(end), s + 1);
  const overlapping = periods
    .map((p, index) => ({
      index,
      overlap: Math.min(e, minutes(p.end)) - Math.max(s, minutes(p.start)),
    }))
    .filter((p) => p.overlap > 0);
  const first = overlapping[0];
  const last = overlapping[overlapping.length - 1];
  if (first !== undefined && last !== undefined) {
    return { period: String(first.index + 1), span: last.index - first.index + 1 };
  }
  let nearest = 0;
  periods.forEach((p, index) => {
    const best = periods[nearest];
    if (best !== undefined && Math.abs(minutes(p.start) - s) < Math.abs(minutes(best.start) - s)) {
      nearest = index;
    }
  });
  return { period: String(nearest + 1), span: 1 };
};

/** Is `date` inside a range the cache has actually fetched? Outside it, nothing is known. */
export const isCovered = (schedule: UniversitySchedule, date: ISODate): boolean =>
  schedule.covered.some((r) => r.from <= date && date <= r.to);

const toLesson = (periods: readonly Period[], event: UniversityEvent): ResolvedLesson => {
  const { period, span } = slotsOf(periods, event.start, event.end);
  const subjectId = event.subjectCode ?? event.subject;
  return {
    period,
    start: event.start,
    end: event.end,
    span,
    subject: { id: subjectId, name: event.subject, short: event.subject },
    teachers: event.lecturers.map((name) => ({ id: name, name, short: name })),
    rooms: event.room === null ? [] : [{ id: event.room, name: event.room, short: event.room }],
    group: event.subgroup,
    status: event.cancelled ? "cancelled" : "normal",
    changeNote: null,
    ...(event.building === null ? {} : { building: event.building }),
  };
};

/**
 * Subgroups the group's events are split into ("fiziviens", "fizidivi", …), sorted. Empty when
 * the group is never split — always so at RTU, where a subgroup is its own group.
 */
export const listUniversitySubgroups = (schedule: UniversitySchedule | null): string[] =>
  [
    ...new Set((schedule?.events ?? []).flatMap((e) => (e.subgroup === null ? [] : [e.subgroup]))),
  ].sort((a, b) => a.localeCompare(b, "lv"));

export type UniversityResolveOptions = {
  /** Show only whole-group events plus this subgroup's. `null` shows everything. */
  subgroup?: string | null;
};

/**
 * One date of a group's schedule, or `null` when that date has not been fetched — the same
 * "not cached yet" signal `resolvedDay` gives for an EduPage week that isn't downloaded.
 */
export const resolveUniversityDay = (
  schedule: UniversitySchedule,
  date: ISODate,
  options: UniversityResolveOptions = {},
): ResolvedDay | null => {
  if (!isCovered(schedule, date)) return null;
  const periods = UNIVERSITY_SLOTS[schedule.university];
  const subgroup = options.subgroup ?? null;
  const lessons = schedule.events
    .filter(
      (e) =>
        e.date === date && (subgroup === null || e.subgroup === null || e.subgroup === subgroup),
    )
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
    .map((e) => toLesson(periods, e));

  const buildings = [
    ...new Set(lessons.flatMap((l) => (l.building === undefined ? [] : [l.building]))),
  ];
  const fallback = UNIVERSITY_SHORT[schedule.university];

  return {
    date,
    weekday: weekdayOf(date),
    classId: schedule.groupId,
    building: buildings[0] ?? fallback,
    // A free day is in no building: listing the fallback would announce a trip to "LU".
    buildings,
    ttNum: `${schedule.university}:${schedule.groupId}`,
    lessons,
    periods: [...periods],
    notes: [],
    stale: false,
  };
};
