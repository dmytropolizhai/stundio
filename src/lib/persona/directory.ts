/**
 * Who the user is *in EduPage's data*, and what their day is — the one answer to both.
 *
 * `identity.ts` stops at the user's own pick (a class id, a teacher id). Everything after that
 * needs the cached timetables: the id has to become a ref, the ref a display label (what the
 * widget, the share card and Web Push name), a substitution-feed key (the feed only speaks in
 * display names, and a teacher's name in either word order — `teacherKey`), a teacher's form
 * class, and finally a resolved day. That chain used to be re-walked in the store, sync, the
 * widget, notifications, the share card and the persona hooks, and the copies drifted (one
 * skipped an empty short, one didn't; one fell back to the raw id, the rest to `null`). Now
 * they all ask here.
 *
 * Pure and React-free: it takes a plain snapshot of cached data and knows nothing of `db`,
 * `store` or `ui`. Day resolution comes back as a *plan* — a memo key plus a thunk — so the
 * store can memoise without hand-building keys, and the key can't miss an input the resolve
 * reads.
 */
import {
  findClassTeacher,
  findTeacherFormClassId,
  movedAwayTo,
  resolveDayAcross,
  resolveTeacherDayAcross,
  selectTimetables,
  teacherKey,
  type Building,
  type ClassRef,
  type DaySource,
  type DaySubstitutions,
  type ISODate,
  type ResolvedDay,
  type ResolvedTeacherDay,
  type TeacherRef,
  type Timetable,
  type TimetableMeta,
} from "@/lib/edupage";
import { weekDates } from "@/lib/schedule";
import { matchPersona, type Identity, type TeacherView } from "./identity.ts";

/** The cached data a day is resolved from — the store's state, minus everything else. */
export type DirectorySnapshot = {
  identity: Identity;
  metas: readonly TimetableMeta[];
  timetables: Readonly<Record<string, Timetable>>;
  substitutions: Readonly<Record<ISODate, DaySubstitutions>>;
  building: Building | null;
  showMovedOnTargetDay: boolean;
};

export type ClassEntry = {
  id: string;
  ref: ClassRef | null;
  /** The display short ("A1-2") — what the substitution feed keys a class by. */
  label: string | null;
  formTeacher: TeacherRef | null;
};

export type TeacherEntry = {
  id: string;
  ref: TeacherRef | null;
  /** The teacher's short, or full name when the school publishes no short. */
  label: string | null;
  /**
   * `teacherKey(label)`: the word-order-free name the feed is matched by. Sync's change
   * detection, the cover-duty check and Web Push's hash all use this one value.
   */
  feedKey: string | null;
};

export type PersonaSubject =
  | { persona: "student"; class: ClassEntry }
  | {
      persona: "teacher";
      teacher: TeacherEntry;
      view: TeacherView;
      /** The class this teacher is form teacher of — what the form-class view shows. */
      formClass: ClassEntry | null;
    };

/**
 * The first ref under `id` that carries a usable label, else the first ref at all. A class lives
 * in one building's timetable and only has a pointer row elsewhere, so "first found" alone could
 * pick a row with an empty short.
 */
const lookup = <T extends { id: string }>(
  timetables: Iterable<Timetable>,
  table: (timetable: Timetable) => readonly T[],
  id: string,
  labelOf: (ref: T) => string,
): { ref: T | null; label: string | null } => {
  let fallback: T | null = null;
  for (const timetable of timetables) {
    const ref = table(timetable).find((r) => r.id === id);
    if (ref === undefined) continue;
    const label = labelOf(ref);
    if (label !== "") return { ref, label };
    fallback ??= ref;
  }
  return { ref: fallback, label: null };
};

export const classEntry = (timetables: Iterable<Timetable>, classId: string): ClassEntry => {
  const list = [...timetables];
  const { ref, label } = lookup(
    list,
    (t) => t.classes,
    classId,
    (c) => c.short,
  );
  return { id: classId, ref, label, formTeacher: findClassTeacher(list, classId) };
};

export const teacherEntry = (timetables: Iterable<Timetable>, teacherId: string): TeacherEntry => {
  const { ref, label } = lookup(
    timetables,
    (t) => t.teachers,
    teacherId,
    (t) => t.short || t.name,
  );
  return { id: teacherId, ref, label, feedKey: label === null ? null : teacherKey(label) };
};

/** The resolved subject of the active role, or `null` while nothing is picked. */
export const resolveSubject = (
  identity: Identity,
  timetables: Iterable<Timetable>,
): PersonaSubject | null => {
  const list = [...timetables];
  return matchPersona<PersonaSubject | null>(identity, {
    student: ({ classId }) =>
      classId === null ? null : { persona: "student", class: classEntry(list, classId) },
    teacher: ({ teacherId, view }) => {
      if (teacherId === null) return null;
      const formClassId = findTeacherFormClassId(list, teacherId);
      return {
        persona: "teacher",
        teacher: teacherEntry(list, teacherId),
        view,
        formClass: formClassId === null ? null : classEntry(list, formClassId),
      };
    },
  });
};

export type LabelOptions = {
  /**
   * Fall back to the raw EduPage id when the pick is made but no cached timetable knows it yet.
   * Only the widget wants this: its payload reads a `null` label as "pick a class", while a
   * known-but-uncached pick must read as "no data yet". Everything matching against the feed
   * must leave it off — the feed never speaks in ids.
   */
  fallbackToId?: boolean;
};

/**
 * Whom the active role is keyed by, by display name: the class short for a student, the
 * teacher's own label for a teacher (in either view — the form-class view changes the grid,
 * not who the user is).
 */
export const subjectLabel = (
  subject: PersonaSubject | null,
  { fallbackToId = false }: LabelOptions = {},
): string | null => {
  if (subject === null) return null;
  const entry = subject.persona === "student" ? subject.class : subject.teacher;
  return entry.label ?? (fallbackToId ? entry.id : null);
};

/* ------------------------------------------------------------------ *
 * Day resolution
 * ------------------------------------------------------------------ */

/** A day to resolve: `key` changes exactly when `resolve()`'s output could. */
export type DayPlan<T extends ResolvedDay> = { key: string; resolve: () => T };

export type AnyDayPlan =
  ({ kind: "class" } & DayPlan<ResolvedDay>) | ({ kind: "teacher" } & DayPlan<ResolvedTeacherDay>);

/**
 * One source per building, not one overall: in automatic mode a class's lessons live in
 * whichever building published them, and the other buildings only carry a pointer row
 * (`resolveDayAcross`). A pinned building narrows this to a single source.
 */
const sourcesFor = (snapshot: DirectorySnapshot, date: ISODate): DaySource[] =>
  selectTimetables(snapshot.metas, date, snapshot.building ?? undefined).flatMap((selection) => {
    const timetable = snapshot.timetables[selection.meta.ttNum];
    // Not cached yet — `sync` fetches it; until then the other buildings still resolve.
    return timetable === undefined ? [] : [{ timetable, stale: selection.stale }];
  });

const sourcesKey = (sources: readonly DaySource[]): string =>
  sources.map((s) => s.timetable.meta.ttNum).join(",");

/**
 * The subgroup a class day is filtered by: the student's own division, and never one applied
 * to a teacher's form class.
 */
const subgroupOf = (identity: Identity): string | null =>
  matchPersona(identity, { student: (s) => s.subgroup, teacher: () => null });

export const planClassDay = (
  snapshot: DirectorySnapshot,
  date: ISODate,
  classId: string,
): DayPlan<ResolvedDay> | null => {
  const sources = sourcesFor(snapshot, date);
  if (sources.length === 0) return null;

  const { substitutions } = snapshot;
  const subs = substitutions[date] ?? null;
  const subgroup = subgroupOf(snapshot.identity);
  const relocateMoves = snapshot.showMovedOnTargetDay;

  /* Other days of this week whose feed moves a lesson onto `date`. */
  const sourceDays = relocateMoves
    ? weekDates(date).filter(
        (d) => d !== date && substitutions[d]?.items.some((s) => s.movedToDate === date) === true,
      )
    : [];
  const movesKey = sourceDays.map((d) => `${d}@${substitutions[d]?.fetchedAt}`).join(",");

  return {
    key: `${sourcesKey(sources)}|${classId}|${date}|${subs?.fetchedAt ?? "none"}|${subgroup ?? ""}|${relocateMoves ? "r" : "-"}|${movesKey}`,
    resolve: () => {
      const incomingMoves = sourceDays.flatMap((d) =>
        movedAwayTo(
          resolveDayAcross(sources, substitutions[d] ?? null, classId, d, { subgroup }),
          date,
        ),
      );
      return resolveDayAcross(sources, subs, classId, date, {
        subgroup,
        relocateMoves,
        incomingMoves,
      });
    },
  };
};

export const planTeacherDay = (
  snapshot: DirectorySnapshot,
  date: ISODate,
  teacherId: string,
): DayPlan<ResolvedTeacherDay> | null => {
  const sources = sourcesFor(snapshot, date);
  if (sources.length === 0) return null;
  const subs = snapshot.substitutions[date] ?? null;
  return {
    key: `teacher|${sourcesKey(sources)}|${teacherId}|${date}|${subs?.fetchedAt ?? "none"}`,
    resolve: () => resolveTeacherDayAcross(sources, subs, teacherId, date),
  };
};

const tagged = <K extends AnyDayPlan["kind"], T extends ResolvedDay>(
  kind: K,
  plan: DayPlan<T> | null,
): (DayPlan<T> & { kind: K }) | null => (plan === null ? null : { kind, ...plan });

/**
 * The day the active role is looking at: a student's class; a teacher's own timetable, or in
 * the form-class view their form class's (their own, when they are no form teacher).
 */
export const planDay = (snapshot: DirectorySnapshot, date: ISODate): AnyDayPlan | null =>
  matchPersona<AnyDayPlan | null>(snapshot.identity, {
    student: ({ classId }) =>
      classId === null ? null : tagged("class", planClassDay(snapshot, date, classId)),
    teacher: ({ teacherId, view }) => {
      if (teacherId === null) return null;
      const formClassId =
        view === "form-class"
          ? findTeacherFormClassId(Object.values(snapshot.timetables), teacherId)
          : null;
      return formClassId === null
        ? tagged("teacher", planTeacherDay(snapshot, date, teacherId))
        : tagged("class", planClassDay(snapshot, date, formClassId));
    },
  });

/** `planDay` without the memo seam — for callers that resolve one day once. */
export const dayFor = (snapshot: DirectorySnapshot, date: ISODate): ResolvedDay | null =>
  planDay(snapshot, date)?.resolve() ?? null;
