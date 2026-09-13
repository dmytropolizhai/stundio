/**
 * Picking the right published timetable for a date + building. See MODEL.md §3.
 *
 * RVT republishes weekly AND separately per building, so `tt_num` alone means nothing
 * without the pair (date, building).
 */
import type { Building, ISODate, TeacherRef, Timetable, TimetableMeta } from "./types.ts";

export type TimetableSelection = {
  meta: TimetableMeta;
  /** True when no published timetable actually covers `date` — show a warning. */
  stale: boolean;
};

/** ISO date strings sort lexicographically, so plain comparison is safe here. */
const covers = (meta: TimetableMeta, date: ISODate): boolean =>
  meta.validFrom <= date && (meta.validTo === undefined || date <= meta.validTo);

/**
 * Newest `validFrom` ≤ date, restricted to `building` when given.
 * Falls back to the newest entry for that building and flags `stale` when nothing covers
 * the date (e.g. next week's timetable is not published yet).
 */
export const selectTimetable = (
  metas: readonly TimetableMeta[],
  date: ISODate,
  building?: Building,
): TimetableSelection | null => {
  const pool = building === undefined ? metas : metas.filter((m) => m.building === building);
  if (pool.length === 0) return null;

  const sorted = [...pool].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const started = sorted.filter((m) => m.validFrom <= date);

  const chosen = started.at(-1) ?? sorted[0];
  if (chosen === undefined) return null;

  return { meta: chosen, stale: !covers(chosen, date) };
};

/** Distinct buildings across the published timetables, for the picker UI. */
export const listBuildings = (metas: readonly TimetableMeta[]): Building[] => [
  ...new Set(metas.map((m) => m.building).filter((b) => b !== "")),
];

/**
 * RVT's main building, as it comes back verbatim in the ttviewer label (see
 * `parseTimetableLabel` in `normalize.ts`). Automatic building mode pools every building's
 * timetables and picks by date alone (see `selectTimetable` above), so a day can legitimately
 * resolve to the "TIC" annex instead — the UI marks that with `isMainBuilding` rather than
 * hiding it, since the lesson is real.
 */
export const MAIN_BUILDING: Building = "Galvenā ēka";

export const isMainBuilding = (building: Building): boolean => building === MAIN_BUILDING;

/**
 * One selection per building for `date` — what automatic building mode resolves against.
 *
 * RVT publishes a class's week in exactly one building's timetable and leaves a pointer in the
 * others (see `resolveDayAcross`), and it adds buildings mid-year without warning ("TIC Olaine"
 * appeared in week 1176/1177/1178). Enumerating whatever `metas` actually contains is what makes
 * both facts a non-event: a new building is just another entry here.
 *
 * Pinning a building narrows this to that one. `MAIN_BUILDING` sorts first so it stays the
 * primary source of a merged day whenever it contributes at all.
 */
export const selectTimetables = (
  metas: readonly TimetableMeta[],
  date: ISODate,
  building?: Building,
): TimetableSelection[] => {
  if (building !== undefined) {
    const one = selectTimetable(metas, date, building);
    return one === null ? [] : [one];
  }

  const buildings = listBuildings(metas);
  // A school that never labels its timetables ends up here: fall back to the flat pick.
  if (buildings.length === 0) {
    const one = selectTimetable(metas, date);
    return one === null ? [] : [one];
  }

  return buildings
    .sort((a, b) => Number(isMainBuilding(b)) - Number(isMainBuilding(a)) || a.localeCompare(b))
    .flatMap((b) => selectTimetable(metas, date, b) ?? []);
};

/**
 * A class's form teacher ("klases audzinātājs"), or `null` when the school publishes none.
 *
 * Both halves of the join have to come from the *same* timetable: `ClassRef.teacherId` is an id
 * into that timetable's own `teachers` table, and RVT renumbers ids on every weekly republish
 * (MODEL.md §2). So this walks whole timetables rather than a merged class list, and takes the
 * first one that can answer — a class lives in exactly one building's timetable anyway.
 */
export const findClassTeacher = (
  timetables: Iterable<Timetable>,
  classId: string,
): TeacherRef | null => {
  for (const timetable of timetables) {
    const teacherId = timetable.classes.find((c) => c.id === classId)?.teacherId ?? null;
    if (teacherId === null) continue;

    const teacher = timetable.teachers.find((t) => t.id === teacherId);
    if (teacher !== undefined) return teacher;
  }

  return null;
};
