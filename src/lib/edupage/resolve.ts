/**
 * Timetable + DaySubstitutions → ResolvedDay. See MODEL.md §5.
 *
 * The two sides do not share a key space: the base timetable speaks in EduPage ids
 * ("-927", "*1"), the substitution feed speaks in display names ("A1-2", "Gene Ķere").
 * Everything awkward in this file comes from bridging that.
 *
 * Cancelled lessons are KEPT with status "cancelled" — users want to see what was dropped
 * (CLAUDE.md), so this never silently removes a row.
 */
import type {
  DaySubstitutions,
  ISODate,
  Lesson,
  ResolvedDay,
  ResolvedLesson,
  ResolvedStatus,
  RoomRef,
  SubjectRef,
  Substitution,
  TeacherRef,
  Timetable,
  Weekday,
} from "./types.ts";

const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Weekday of an ISO date. Built on Date.UTC so it cannot drift with the host timezone —
 * a plain "YYYY-MM-DD" has no timezone to convert, and Europe/Riga never changes the
 * calendar day of a date-only value.
 */
export const weekdayOf = (date: ISODate): Weekday => {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return "mon";
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "mon";
};

/** "1" (or an empty mask) means every week. A/B-week schools would pass `weekIndex`. */
const matchesWeek = (mask: string, weekIndex?: number): boolean => {
  if (mask === "" || mask === "1") return true;
  if (weekIndex === undefined) return mask.includes("1");
  return mask[weekIndex] === "1";
};

const periodNum = (p: string): number => {
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
};

/** Inclusive period span a lesson occupies: period 7, span 2 → [7, 8]. */
const lessonPeriods = (lesson: Lesson): number[] => {
  const start = periodNum(lesson.period);
  return Array.from({ length: Math.max(1, lesson.periodSpan) }, (_, i) => start + i);
};

const overlaps = (a: readonly number[], b: readonly number[]): boolean =>
  a.some((x) => b.includes(x));

/* ------------------------------------------------------------------ *
 * Name → ref lookup (substitutions only ever give us display strings)
 * ------------------------------------------------------------------ */

const indexByLabel = <T extends { name: string; short: string }>(
  refs: readonly T[],
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const ref of refs) {
    // `short` wins: it is what the substitution feed prints.
    if (ref.name !== "" && !map.has(ref.name)) map.set(ref.name, ref);
    if (ref.short !== "") map.set(ref.short, ref);
  }
  return map;
};

/** A ref for a name the base timetable does not contain; `subst:` marks it synthetic. */
const synthSubject = (name: string): SubjectRef => ({
  id: `subst:${name}`,
  name,
  short: name,
  color: null,
});
const synthTeacher = (name: string): TeacherRef => ({
  id: `subst:${name}`,
  name,
  short: name,
  color: null,
});
const synthRoom = (name: string): RoomRef => ({ id: `subst:${name}`, name, short: name });

/* ------------------------------------------------------------------ *
 * Status precedence
 * ------------------------------------------------------------------ */

const STATUS_RANK: Record<ResolvedStatus, number> = {
  cancelled: 5,
  moved: 4,
  substituted: 3,
  room_change: 2,
  added: 1,
  normal: 0,
};

const strongerStatus = (a: ResolvedStatus, b: ResolvedStatus): ResolvedStatus =>
  STATUS_RANK[b] > STATUS_RANK[a] ? b : a;

const STATUS_FOR_KIND: Partial<Record<Substitution["kind"], ResolvedStatus>> = {
  cancelled: "cancelled",
  moved_out: "moved",
  substitution: "substituted",
  room_change: "room_change",
  moved_in: "added",
  added: "added",
};

/* ------------------------------------------------------------------ *
 * resolveDay
 * ------------------------------------------------------------------ */

export type ResolveOptions = {
  /** A/B-week index; omit for schools that publish a single week (RVT does). */
  weekIndex?: number;
  /** Override the computed staleness (e.g. when the caller already ran selectTimetable). */
  stale?: boolean;
};

export const resolveDay = (
  timetable: Timetable,
  subs: DaySubstitutions | null,
  classId: string,
  date: ISODate,
  options: ResolveOptions = {},
): ResolvedDay => {
  const weekday = weekdayOf(date);
  const classRef = timetable.classes.find((c) => c.id === classId);
  const className = classRef?.short ?? "";

  const subjects = new Map(timetable.subjects.map((s) => [s.id, s]));
  const teachers = new Map(timetable.teachers.map((t) => [t.id, t]));
  const rooms = new Map(timetable.rooms.map((r) => [r.id, r]));
  const periods = new Map(timetable.periods.map((p) => [p.period, p]));

  const subjectsByLabel = indexByLabel(timetable.subjects);
  const teachersByLabel = indexByLabel(timetable.teachers);
  const roomsByLabel = indexByLabel(timetable.rooms);

  const timeOf = (start: number, span: number): { start: string; end: string } => ({
    start: periods.get(String(start))?.start ?? "",
    end: periods.get(String(start + span - 1))?.end ?? periods.get(String(start))?.end ?? "",
  });

  // 1. base lessons for this class on this weekday
  const base = timetable.lessons
    .filter(
      (l) =>
        l.classIds.includes(classId) &&
        l.day === weekday &&
        matchesWeek(l.weekMask, options.weekIndex),
    )
    .sort((a, b) => periodNum(a.period) - periodNum(b.period));

  // 2. this class's substitutions, split by whether they vacate a slot or create one
  const mine = (subs?.items ?? []).filter((s) => s.className === className);
  const appliesTo = (s: Substitution, lesson: Lesson): boolean => {
    // A group-less row is a whole-class change; a group row only hits that group's lesson.
    if (s.group !== null && !lesson.groups.includes(s.group)) return false;
    return overlaps(s.periods, lessonPeriods(lesson));
  };
  const isNewLesson = (s: Substitution): boolean => s.kind === "moved_in" || s.kind === "added";

  const consumed = new Set<Substitution>();
  const out: ResolvedLesson[] = [];

  // 3. base lessons with their changes applied
  for (const lesson of base) {
    const span = Math.max(1, lesson.periodSpan);
    const startPeriod = periodNum(lesson.period);
    const applied = mine.filter((s) => !isNewLesson(s) && appliesTo(s, lesson));
    for (const s of applied) consumed.add(s);

    let status: ResolvedStatus = "normal";
    let changeNote: string | null = null;
    let teacherList = lesson.teacherIds.map((id) => teachers.get(id)).filter(isRef);
    let roomList = lesson.roomIds.map((id) => rooms.get(id)).filter(isRef);
    const original: NonNullable<ResolvedLesson["original"]> = {};

    for (const s of applied) {
      status = strongerStatus(status, STATUS_FOR_KIND[s.kind] ?? "normal");
      changeNote = changeNote === null ? s.raw : `${changeNote} · ${s.raw}`;

      if (s.teacher !== null && s.kind === "substitution") {
        original.teachers = teacherList;
        teacherList = [teachersByLabel.get(s.teacher) ?? synthTeacher(s.teacher)];
      }
      if (s.room !== null) {
        original.rooms = roomList;
        roomList = [roomsByLabel.get(s.room) ?? synthRoom(s.room)];
      }
      if (s.movedToPeriod !== null || s.movedToDate !== null) {
        original.period = lesson.period;
      }
    }

    out.push({
      period: lesson.period,
      ...timeOf(startPeriod, span),
      span,
      subject: subjects.get(lesson.subjectId) ?? null,
      teachers: teacherList,
      rooms: roomList,
      group: lesson.groups[0] ?? null,
      status,
      changeNote,
      original: Object.keys(original).length > 0 ? original : null,
    });
  }

  // 4. lessons that exist only in the substitution feed
  for (const s of mine) {
    if (!isNewLesson(s) || consumed.has(s)) continue;
    const start = s.periods[0];
    if (start === undefined) continue;
    const span = Math.max(1, s.periods.length);

    out.push({
      period: String(start),
      ...timeOf(start, span),
      span,
      subject:
        s.subject === null ? null : (subjectsByLabel.get(s.subject) ?? synthSubject(s.subject)),
      teachers:
        s.teacher === null ? [] : [teachersByLabel.get(s.teacher) ?? synthTeacher(s.teacher)],
      rooms: s.room === null ? [] : [roomsByLabel.get(s.room) ?? synthRoom(s.room)],
      group: s.group,
      status: "added",
      changeNote: s.raw,
      original: s.movedFromPeriod !== null ? { period: String(s.movedFromPeriod) } : null,
    });
  }

  out.sort((a, b) => periodNum(a.period) - periodNum(b.period));

  return {
    date,
    weekday,
    classId,
    building: timetable.meta.building,
    ttNum: timetable.meta.ttNum,
    lessons: out,
    notes: subs?.notes ?? [],
    stale: options.stale ?? !coversDate(timetable, date),
  };
};

const isRef = <T>(v: T | undefined): v is T => v !== undefined;

const coversDate = (timetable: Timetable, date: ISODate): boolean => {
  const { validFrom, validTo } = timetable.meta;
  return validFrom <= date && (validTo === undefined || date <= validTo);
};
