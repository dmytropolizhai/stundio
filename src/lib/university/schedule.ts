/**
 * The university side of `sync`: which dates to fetch, how a fetch merges into the cached
 * schedule, and the source-agnostic fetchers the engine and the group picker call.
 * Refresh policy: MODEL-UNIVERSITY.md §4.
 */
import type { HttpClient, ISODate, ISODateTime } from "@/lib/edupage";
import { fetchLuCatalog, fetchLuEvents } from "./lu.ts";
import {
  fetchRtuCurrentSemester,
  fetchRtuEvents,
  fetchRtuGroups,
  fetchRtuPrograms,
} from "./rtu.ts";
import type {
  UniversityEvent,
  UniversityGroupRef,
  UniversityId,
  UniversityProgram,
  UniversitySchedule,
} from "./types.ts";

/** A schedule fetched this recently is not refetched on open/resume (pull-to-refresh still does). */
export const UNIVERSITY_MAX_AGE_MS = 10 * 60 * 1000;
/** Events this many days before today are dropped from the cache. */
export const UNIVERSITY_RETENTION_DAYS = 14;

const addDays = (date: ISODate, days: number): ISODate => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return t.toISOString().slice(0, 10);
};

const mondayOf = (date: ISODate): ISODate => {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
};

/** The viewed week plus the next one: what Home, Week and "tomorrow" can ask for. */
export const universityWindow = (date: ISODate): { from: ISODate; to: ISODate } => {
  const from = mondayOf(date);
  return { from, to: addDays(from, 13) };
};

/** Does the cache already hold every day of `range`? */
export const coversRange = (
  schedule: UniversitySchedule | null,
  range: { from: ISODate; to: ISODate },
): boolean =>
  schedule !== null && schedule.covered.some((r) => r.from <= range.from && range.to <= r.to);

const mergeRanges = (
  ranges: { from: ISODate; to: ISODate }[],
): { from: ISODate; to: ISODate }[] => {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  const out: { from: ISODate; to: ISODate }[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    // Adjacent days merge too: [1..7] + [8..14] is one covered stretch.
    if (last !== undefined && r.from <= addDays(last.to, 1)) {
      if (r.to > last.to) last.to = r.to;
    } else {
      out.push({ ...r });
    }
  }
  return out;
};

/**
 * Folds a fresh fetch of `range` into the cached schedule: inside the range the fetch is the
 * truth (a dropped lesson disappears), outside it the cache is kept — weeks already browsed
 * stay readable offline. Anything before `pruneBefore` goes.
 */
export const mergeSchedule = (
  cached: UniversitySchedule | null,
  next: {
    university: UniversityId;
    groupId: string;
    range: { from: ISODate; to: ISODate };
    events: UniversityEvent[];
    fetchedAt: ISODateTime;
  },
  pruneBefore: ISODate,
): UniversitySchedule => {
  const same =
    cached !== null && cached.university === next.university && cached.groupId === next.groupId;
  const kept = same
    ? cached.events.filter((e) => e.date < next.range.from || e.date > next.range.to)
    : [];
  const events = [...kept, ...next.events]
    .filter((e) => e.date >= pruneBefore)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const covered = mergeRanges([...(same ? cached.covered : []), next.range])
    .filter((r) => r.to >= pruneBefore)
    .map((r) => (r.from < pruneBefore ? { from: pruneBefore, to: r.to } : r));
  return {
    university: next.university,
    groupId: next.groupId,
    events,
    covered,
    fetchedAt: next.fetchedAt,
  };
};

export const pruneDate = (today: ISODate): ISODate => addDays(today, -UNIVERSITY_RETENTION_DAYS);

export const fetchUniversityEvents = (
  http: HttpClient,
  university: UniversityId,
  groupId: string,
  range: { from: ISODate; to: ISODate },
): Promise<UniversityEvent[]> =>
  university === "rtu"
    ? fetchRtuEvents(http, groupId, range.from, range.to)
    : fetchLuEvents(http, groupId, range.from, range.to);

/** A catalogue entry, carrying its groups when the source lists them up front (LU). */
export type UniversityProgramEntry = UniversityProgram & {
  groups?: UniversityGroupRef[];
  /** RTU groups are listed per semester. */
  semesterId?: string;
};

export const fetchUniversityPrograms = async (
  http: HttpClient,
  university: UniversityId,
): Promise<UniversityProgramEntry[]> => {
  if (university === "lu") return fetchLuCatalog(http);
  const semester = await fetchRtuCurrentSemester(http);
  const programs = await fetchRtuPrograms(http, semester.id);
  return programs.map((p) => ({ ...p, semesterId: semester.id }));
};

export const fetchUniversityGroups = async (
  http: HttpClient,
  program: UniversityProgramEntry,
): Promise<UniversityGroupRef[]> => {
  if (program.groups !== undefined) return program.groups;
  if (program.university === "rtu" && program.semesterId !== undefined) {
    return fetchRtuGroups(http, program.semesterId, program);
  }
  return [];
};
