/**
 * Timetable + DaySubstitutions → ResolvedDay. See MODEL.md §5.
 *
 * The two sides do not share a key space: the base timetable speaks in EduPage ids
 * ("-927", "*1"), the substitution feed speaks in display names ("A1-2", "Gene Ķere").
 * Everything awkward in this file comes from bridging that.
 *
 * A day can also come from more than one *building* (MODEL.md §3): RVT publishes a class's week
 * in one building's timetable and leaves a pointer row in every other building's, so automatic
 * building mode has to merge several timetables into one day. `resolveDayAcross` is that merge;
 * `resolveDay` is the single-source case of it.
 *
 * Cancelled lessons are KEPT with status "cancelled" — users want to see what was dropped
 * (CLAUDE.md), so this never silently removes a row.
 */
import type {
  Building,
  DaySubstitutions,
  ISODate,
  Lesson,
  Period,
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

/**
 * A divided class ("pusgrupa") publishes both halves' lessons in the same timetable, tagged
 * with the division label in `Lesson.groups` — see MODEL.md §2. A whole-class lesson (`groups`
 * empty) always applies; a divided one only applies to the subgroup the user picked. `subgroup`
 * of `null`/`undefined` means "no subgroup chosen" — every division is shown, which is the
 * pre-subgroup-support behaviour for a class the user hasn't disambiguated yet.
 */
const matchesSubgroup = (groups: readonly string[], subgroup: string | null | undefined): boolean =>
  groups.length === 0 || subgroup == null || groups.includes(subgroup);

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
  into: Map<string, T> = new Map(),
): Map<string, T> => {
  for (const ref of refs) {
    // `short` wins: it is what the substitution feed prints.
    if (ref.name !== "" && !into.has(ref.name)) into.set(ref.name, ref);
    if (ref.short !== "") into.set(ref.short, ref);
  }
  return into;
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
 * Base lessons, per source timetable
 * ------------------------------------------------------------------ */

/**
 * A base lesson plus the bits the substitution pass needs and `ResolvedLesson` does not carry:
 * the division labels it belongs to and the periods it occupies.
 */
type BaseEntry = {
  lesson: ResolvedLesson;
  groups: string[];
  periods: number[];
};

/**
 * A class's placed lessons for one weekday in ONE timetable, refs already resolved.
 *
 * Ids are only unique within a timetable, so every id → ref lookup has to happen here, against
 * the timetable the lesson came from, before anything is merged across buildings.
 */
const baseEntries = (
  timetable: Timetable,
  classId: string,
  weekday: Weekday,
  weekIndex: number | undefined,
  subgroup: string | null | undefined,
): BaseEntry[] => {
  const subjects = new Map(timetable.subjects.map((s) => [s.id, s]));
  const teachers = new Map(timetable.teachers.map((t) => [t.id, t]));
  const rooms = new Map(timetable.rooms.map((r) => [r.id, r]));
  const timeOf = periodTimes(timetable.periods);

  return timetable.lessons
    .filter(
      (l) =>
        l.classIds.includes(classId) &&
        l.day === weekday &&
        matchesWeek(l.weekMask, weekIndex) &&
        matchesSubgroup(l.groups, subgroup),
    )
    .sort((a, b) => periodNum(a.period) - periodNum(b.period))
    .map((lesson) => {
      const span = Math.max(1, lesson.periodSpan);
      return {
        groups: lesson.groups,
        periods: lessonPeriods(lesson),
        lesson: {
          period: lesson.period,
          ...timeOf(periodNum(lesson.period), span),
          span,
          subject: subjects.get(lesson.subjectId) ?? null,
          teachers: lesson.teacherIds.map((id) => teachers.get(id)).filter(isRef),
          rooms: lesson.roomIds.map((id) => rooms.get(id)).filter(isRef),
          group: lesson.groups[0] ?? null,
          status: "normal" as const,
          changeNote: null,
          original: null,
          building: timetable.meta.building,
        },
      };
    });
};

const periodTimes =
  (periods: readonly Period[]) =>
  (start: number, span: number): { start: string; end: string } => {
    const byKey = new Map(periods.map((p) => [p.period, p]));
    return {
      start: byKey.get(String(start))?.start ?? "",
      end: byKey.get(String(start + span - 1))?.end ?? byKey.get(String(start))?.end ?? "",
    };
  };

/**
 * A "pointer": the row RVT puts in a building's timetable for a class that spends that day
 * somewhere else. It carries no teacher and no room, and its subject text is literally the other
 * building's street address ("Kr.Valdemāra iela 1C", "Tehnoloģiju un inovāciju centrs Dārzciema
 * ielā"). Rendering it as a lesson is what made automatic mode show "TIC" as a subject — and its
 * `durationperiods` is the whole school day, so it also swallowed the day in the week grid.
 *
 * Matched structurally rather than by address text, because a new building brings a new address
 * (MODEL.md §3). Teacher-less real lessons do exist ("Prakse", "Valsts aizsardzība"), so this is
 * only ever acted on when the day is *nothing but* pointers AND another building actually has
 * that day's lessons — see `resolveDayAcross`.
 */
const isPointer = (entry: BaseEntry): boolean =>
  entry.lesson.teachers.length === 0 && entry.lesson.rooms.length === 0;

/** A lesson plus the timetable it came from — ids only resolve against their own source. */
export type ClassWeekLesson = { lesson: Lesson; timetable: Timetable };

/**
 * Every placed lesson a class has in a week, merged across the buildings that published it and
 * with the pointer rows removed — the week-scoped twin of `resolveDayAcross`, for callers that
 * summarise a class rather than render a date (the subject catalogue).
 *
 * The pointer rule is per weekday, exactly as in a resolved day: a weekday is only ever taken
 * from one building, and a pointer survives when no other building published that day.
 */
export const classWeekLessons = (
  timetables: readonly Timetable[],
  classId: string,
  weekIndex?: number,
  subgroup?: string | null,
): ClassWeekLesson[] => {
  const out: ClassWeekLesson[] = [];

  for (const weekday of WEEKDAYS) {
    const perSource = timetables.map((timetable) =>
      timetable.lessons
        .filter(
          (l) =>
            l.classIds.includes(classId) &&
            l.day === weekday &&
            matchesWeek(l.weekMask, weekIndex) &&
            matchesSubgroup(l.groups, subgroup),
        )
        .map((lesson) => ({ lesson, timetable })),
    );
    const substantive = perSource.filter((entries) =>
      entries.some((e) => e.lesson.teacherIds.length > 0 || e.lesson.roomIds.length > 0),
    );
    for (const entries of substantive.length > 0 ? substantive : perSource) out.push(...entries);
  }

  // Same de-duplication as the day merge: two buildings publishing the same lesson is one
  // lesson. Keyed on the subject's *label*, since ids only mean anything inside one timetable.
  const seen = new Set<string>();
  return out.filter(({ lesson, timetable }) => {
    const subject = timetable.subjects.find((x) => x.id === lesson.subjectId);
    const key = [
      lesson.day,
      lesson.period,
      lesson.periodSpan,
      subject?.name ?? subject?.short ?? lesson.subjectId,
      lesson.groups.join("+"),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Distinct division labels a class's lessons are split into ("1"/"2" for a pusgrupa split),
 * across every building that publishes the class — for the subgroup picker UI. A class with
 * no divided lessons returns `[]`, which is how callers decide whether to ask at all.
 */
export const listSubgroups = (timetables: readonly Timetable[], classId: string): string[] => {
  const labels = new Set<string>();
  for (const timetable of timetables) {
    for (const lesson of timetable.lessons) {
      if (!lesson.classIds.includes(classId)) continue;
      for (const group of lesson.groups) labels.add(group);
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "lv"));
};

/* ------------------------------------------------------------------ *
 * resolveDay
 * ------------------------------------------------------------------ */

export type ResolveOptions = {
  /** A/B-week index; omit for schools that publish a single week (RVT does). */
  weekIndex?: number;
  /** Override the computed staleness (e.g. when the caller already ran selectTimetable). */
  stale?: boolean;
  /** The user's pusgrupa within a divided class; `null`/omitted shows every division. */
  subgroup?: string | null;
};

/** One building's published week, as handed to `resolveDayAcross`. */
export type DaySource = {
  timetable: Timetable;
  /** `selectTimetable`'s verdict for this source; computed from the timetable when omitted. */
  stale?: boolean;
};

export const resolveDay = (
  timetable: Timetable,
  subs: DaySubstitutions | null,
  classId: string,
  date: ISODate,
  options: ResolveOptions = {},
): ResolvedDay =>
  resolveDayAcross(
    [{ timetable, ...(options.stale === undefined ? {} : { stale: options.stale }) }],
    subs,
    classId,
    date,
    options,
  );

/**
 * The same merge across every building that published a week covering `date`.
 *
 * Sources are tried in order and the first one that contributes a real lesson becomes the day's
 * primary building. Pointer-only days (see `isPointer`) are dropped as soon as some other source
 * has substance, and kept when none does — so a class whose other building simply is not cached
 * still sees the address rather than an empty day.
 *
 * Substitutions are applied ONCE, after the merge: the feed is school-wide and keyed by class
 * name, so resolving each building separately would duplicate every added lesson per source.
 */
export const resolveDayAcross = (
  sources: readonly DaySource[],
  subs: DaySubstitutions | null,
  classId: string,
  date: ISODate,
  options: ResolveOptions = {},
): ResolvedDay => {
  const weekday = weekdayOf(date);
  const primary = sources[0]?.timetable;

  const perSource = sources.map((source) => ({
    source,
    entries: baseEntries(source.timetable, classId, weekday, options.weekIndex, options.subgroup),
  }));

  const substantive = perSource.filter((s) => s.entries.some((e) => !isPointer(e)));
  const contributing = (substantive.length > 0 ? substantive : perSource).filter(
    (s) => s.entries.length > 0,
  );

  /*
   * Two buildings can carry the same lesson (a class listed in both, a week republished under a
   * new building name). Identity is what the user would see on the card — period, subject,
   * group, teachers, rooms — so a genuine parallel-group lesson still survives as its own row.
   */
  const seen = new Set<string>();
  const base = contributing
    .flatMap((s) => s.entries)
    .filter((entry) => {
      const { period, span, subject, group, teachers, rooms } = entry.lesson;
      const key = [
        period,
        span,
        subject?.name ?? subject?.short ?? "",
        group ?? "",
        teachers.map((x) => x.short).join("+"),
        rooms.map((x) => x.short).join("+"),
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const lead = contributing[0]?.source.timetable ?? primary;

  /* Labels are display strings, so a merged index across sources is safe (and needed: an
     added lesson's teacher may only exist in the building the class actually sits in). */
  const subjectsByLabel = new Map<string, SubjectRef>();
  const teachersByLabel = new Map<string, TeacherRef>();
  const roomsByLabel = new Map<string, RoomRef>();
  const periods: Period[] = [];
  for (const { timetable } of sources) {
    indexByLabel(timetable.subjects, subjectsByLabel);
    indexByLabel(timetable.teachers, teachersByLabel);
    indexByLabel(timetable.rooms, roomsByLabel);
    for (const p of timetable.periods)
      if (!periods.some((q) => q.period === p.period)) periods.push(p);
  }
  const timeOf = periodTimes(periods);

  const className =
    contributing
      .map((s) => s.source.timetable.classes.find((c) => c.id === classId)?.short)
      .find((short) => short !== undefined && short !== "") ??
    sources
      .map((s) => s.timetable.classes.find((c) => c.id === classId)?.short)
      .find((short) => short !== undefined) ??
    "";

  const mine = (subs?.items ?? []).filter((s) => s.className === className);
  const appliesTo = (s: Substitution, entry: BaseEntry): boolean => {
    // A group-less row is a whole-class change; a group row only hits that group's lesson.
    if (s.group !== null && !entry.groups.includes(s.group)) return false;
    return overlaps(s.periods, entry.periods);
  };
  const isNewLesson = (s: Substitution): boolean => s.kind === "moved_in" || s.kind === "added";

  const consumed = new Set<Substitution>();
  const out: ResolvedLesson[] = [];

  // Base lessons with their changes applied.
  for (const entry of base) {
    const applied = mine.filter((s) => !isNewLesson(s) && appliesTo(s, entry));
    for (const s of applied) consumed.add(s);

    let status: ResolvedStatus = "normal";
    let changeNote: string | null = null;
    let teacherList = entry.lesson.teachers;
    let roomList = entry.lesson.rooms;
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
        original.period = entry.lesson.period;
      }
    }

    out.push({
      ...entry.lesson,
      teachers: teacherList,
      rooms: roomList,
      status,
      changeNote,
      original: Object.keys(original).length > 0 ? original : null,
    });
  }

  // Lessons that exist only in the substitution feed.
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
      ...(lead === undefined ? {} : { building: lead.meta.building }),
    });
  }

  out.sort((a, b) => periodNum(a.period) - periodNum(b.period));

  const buildings: Building[] = [];
  for (const lesson of out) {
    if (lesson.building !== undefined && !buildings.includes(lesson.building)) {
      buildings.push(lesson.building);
    }
  }

  const leadSource = contributing[0]?.source ?? sources[0];

  return {
    date,
    weekday,
    classId,
    building: buildings[0] ?? lead?.meta.building ?? "",
    buildings,
    ttNum: lead?.meta.ttNum ?? "",
    lessons: out,
    notes: subs?.notes ?? [],
    stale:
      options.stale ?? leadSource?.stale ?? (lead === undefined ? false : !coversDate(lead, date)),
  };
};

const isRef = <T>(v: T | undefined): v is T => v !== undefined;

const coversDate = (timetable: Timetable, date: ISODate): boolean => {
  const { validFrom, validTo } = timetable.meta;
  return validFrom <= date && (validTo === undefined || date <= validTo);
};
