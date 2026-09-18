/**
 * Stale-while-revalidate orchestration (PLAN.md Phase 2).
 *
 * Nothing here blocks a render: the UI reads whatever the cache holds, and `sync()` writes
 * fresher data in as it arrives. Every dependency (http, cache, clock) is injected, so the
 * whole policy is testable without a network or a browser.
 *
 * Refresh policy, per MODEL.md §6:
 *   timetable list  → refetch when older than 12h
 *   regular week    → fetch only when that tt_num is not cached (it never changes in place)
 *   substitutions   → ALWAYS refetch today + next school day
 */
import {
  EdupageError,
  fetchDaySubstitutionsHtml,
  fetchRegularTimetable,
  fetchTimetableList,
  normalizeTimetable,
  parseDaySubstitutions,
  selectTimetables,
  toTimetableMeta,
  type Building,
  type HttpClient,
  type ISODate,
  type ISODateTime,
  type TimetableMeta,
} from "@/lib/edupage";
import type { AppCache } from "@/db";
import { substitutionsChanged } from "@/lib/schedule";
import { addDays, daysToRefresh, isWeekend, nextSchoolDay } from "./schoolDays.ts";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncOutcome = {
  status: Exclude<SyncStatus, "syncing">;
  lastSyncAt: ISODateTime | null;
  /** tt_num actually fetched this run (absent when it was already cached). */
  fetchedTtNum: string | null;
  refreshedDates: ISODate[];
  /**
   * Dates among `refreshedDates` whose substitutions differ from what was cached *for the
   * selected class*. School-wide churn — another class losing a teacher, an announcement aimed
   * at a different year — is not a change to this user's timetable and never lands here.
   */
  changedDates: ISODate[];
  prunedDays: number;
  /** Human-readable reasons, in order. Empty on a clean run. */
  errors: string[];
};

export type SyncDeps = {
  http: HttpClient;
  cache: AppCache;
  /** Injected for tests; defaults to the real clock. */
  now?: () => Date;
  subdomain?: string;
};

export type SyncRequest = {
  /** The date the user is looking at. Defaults to today in Europe/Riga. */
  date?: ISODate;
  building?: Building | null;
  /** Skip the 12h freshness check on the timetable list (pull-to-refresh). */
  force?: boolean;
};

export const LIST_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const SUBSTITUTION_RETENTION_DAYS = 14;

/** Today in Europe/Riga — the school's timezone is the only one that matters (CLAUDE.md). */
export const todayInRiga = (now: Date = new Date()): ISODate =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

const describe = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * A failure the sync collected. `server: true` means EduPage answered and rejected us
 * (the `{ e }` envelope, or a bad status) — that is an *error*. Anything else means we
 * never got an answer, which is *offline*: the cache still serves, so it is not fatal.
 */
type SyncFailure = { message: string; server: boolean };

const failure = (context: string, err: unknown): SyncFailure => ({
  message: `${context}: ${describe(err)}`,
  server: err instanceof EdupageError,
});

export const createSyncEngine = (deps: SyncDeps) => {
  const { http, cache, now = () => new Date(), subdomain = "pikcrvt" } = deps;

  const syncTimetableList = async (
    force: boolean,
    errors: SyncFailure[],
  ): Promise<TimetableMeta[]> => {
    const cached = await cache.getTimetableList();
    const age = cached === null ? Infinity : now().getTime() - new Date(cached.fetchedAt).getTime();
    const fresh = !force && cached !== null && age < LIST_MAX_AGE_MS;

    if (fresh && cached !== null) {
      return cached.entries.map((e) => toTimetableMeta(e, cached.fetchedAt));
    }

    try {
      const fetchedAt = now().toISOString();
      const { entries, defaultNum } = await fetchTimetableList(
        http,
        schoolYearOf(todayInRiga(now())),
        subdomain,
      );
      await cache.putTimetableList({ entries, defaultNum, fetchedAt });
      return entries.map((e) => toTimetableMeta(e, fetchedAt));
    } catch (err) {
      errors.push(failure("timetable list", err));
      // Serve the stale list rather than nothing — this is the offline path.
      return cached === null ? [] : cached.entries.map((e) => toTimetableMeta(e, cached.fetchedAt));
    }
  };

  const ensureTimetable = async (
    meta: TimetableMeta,
    errors: SyncFailure[],
  ): Promise<string | null> => {
    if ((await cache.getTimetable(meta.ttNum)) !== null) return null; // already cached
    try {
      const tables = await fetchRegularTimetable(http, meta.ttNum, subdomain);
      const { timetable } = normalizeTimetable(tables, meta);
      await cache.putTimetable(timetable);
      return meta.ttNum;
    } catch (err) {
      errors.push(failure(`timetable ${meta.ttNum}`, err));
      return null;
    }
  };

  /**
   * The display short ("A1-2") the substitution feed keys the user's class by — the bridge
   * between `selectedClassId` (an EduPage id like "-927") and the rows in a `DaySubstitutions`.
   * `null` when no class is picked or none of the cached timetables knows that id, in which
   * case nothing can be reported as changed rather than everything being.
   */
  const selectedClassName = async (
    classId: string | null,
    selections: readonly { meta: TimetableMeta }[],
  ): Promise<string | null> => {
    if (classId === null) return null;
    for (const selection of selections) {
      const timetable = await cache.getTimetable(selection.meta.ttNum);
      const short = timetable?.classes.find((c) => c.id === classId)?.short;
      if (short !== undefined && short !== "") return short;
    }
    return null;
  };

  const refreshSubstitutions = async (
    dates: readonly ISODate[],
    className: string | null,
    errors: SyncFailure[],
  ): Promise<{ done: ISODate[]; changed: ISODate[] }> => {
    const done: ISODate[] = [];
    const changed: ISODate[] = [];
    // Sequential on purpose: two requests, and we are explicitly not hammering the school.
    for (const date of dates) {
      try {
        const before = await cache.getSubstitutions(date);
        const html = await fetchDaySubstitutionsHtml(http, date, "classes", subdomain);
        const after = parseDaySubstitutions(html, date, now().toISOString());
        await cache.putSubstitutions(after);
        done.push(date);
        if (substitutionsChanged(before, after, className)) changed.push(date);
      } catch (err) {
        errors.push(failure(`substitutions ${date}`, err));
      }
    }
    return { done, changed };
  };

  const sync = async (request: SyncRequest = {}): Promise<SyncOutcome> => {
    const errors: SyncFailure[] = [];
    const today = todayInRiga(now());
    const date = request.date ?? today;

    const metas = await syncTimetableList(request.force ?? false, errors);
    const settings = await cache.getSettings();
    const building = request.building ?? settings.building ?? undefined;

    /*
     * Every building's week, not just one: in automatic mode the class's lessons sit in
     * whichever building published them and the rest only carry a pointer row (MODEL.md §3),
     * so resolving a day needs all of them cached. Pinning a building narrows this to one.
     * `ensureTimetable` is a no-op once a tt_num is cached, and a tt_num never changes in
     * place, so this costs one extra fetch per building per week — never per open.
     */
    const selections = selectTimetables(metas, date, building ?? undefined);
    const fetched: string[] = [];
    for (const selection of selections) {
      const num = await ensureTimetable(selection.meta, errors);
      if (num !== null) fetched.push(num);
    }
    const fetchedTtNum = fetched[0] ?? null;

    // On a weekend `date` (today, by default) resolves to the week that just ended — the
    // week the user actually opens the app to see is the next one. Without this, that
    // timetable is only ever fetched once the user forces a refresh from the next-week view.
    if (isWeekend(date)) {
      const current = new Set(selections.map((s) => s.meta.ttNum));
      for (const upcoming of selectTimetables(metas, nextSchoolDay(date), building ?? undefined)) {
        if (!current.has(upcoming.meta.ttNum)) await ensureTimetable(upcoming.meta, errors);
      }
    }

    const { done: refreshedDates, changed: changedDates } = await refreshSubstitutions(
      daysToRefresh(today),
      await selectedClassName(settings.selectedClassId, selections),
      errors,
    );

    const prunedDays = await cache.pruneSubstitutions(addDays(today, -SUBSTITUTION_RETENTION_DAYS));

    const status: SyncOutcome["status"] =
      errors.length === 0 ? "idle" : errors.some((e) => e.server) ? "error" : "offline";

    return {
      status,
      lastSyncAt: errors.length === 0 ? now().toISOString() : null,
      fetchedTtNum,
      refreshedDates,
      changedDates,
      prunedDays,
      errors: errors.map((e) => e.message),
    };
  };

  return { sync };
};

export type SyncEngine = ReturnType<typeof createSyncEngine>;

/** EduPage keys the timetable list by school year: August onwards belongs to the new one. */
export const schoolYearOf = (date: ISODate): number => {
  const [y, m] = date.split("-").map(Number);
  if (y === undefined || m === undefined) return new Date().getUTCFullYear();
  return m >= 8 ? y : y - 1;
};
