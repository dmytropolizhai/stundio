/**
 * Picking the right published timetable for a date + building. See MODEL.md §3.
 *
 * RVT republishes weekly AND separately per building, so `tt_num` alone means nothing
 * without the pair (date, building).
 */
import type { Building, ISODate, TimetableMeta } from "./types.ts";

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
