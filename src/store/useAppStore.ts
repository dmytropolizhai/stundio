/**
 * The app's single store. Holds cached data + sync status; never fetches or parses EduPage
 * itself — that is `sync/` and `src/lib/edupage/` (CLAUDE.md).
 *
 * Reads are cache-first and synchronous once hydrated, so a cold open paints the last-known
 * timetable immediately and the network catches up underneath.
 */
// A vanilla store, not `create()`: this store is per-provider instance and is read
// through React context, which is exactly what `createStore` + `useStore` is for.
import { createStore } from "zustand/vanilla";
import {
  resolveDay,
  selectTimetable,
  toTimetableMeta,
  type Building,
  type DaySubstitutions,
  type ISODate,
  type ISODateTime,
  type ResolvedDay,
  type Timetable,
} from "../lib/edupage/index.ts";
import { DEFAULT_SETTINGS, type AppCache, type Settings } from "../db/index.ts";
import type { SyncEngine, SyncStatus } from "../sync/index.ts";

export type AppState = {
  ready: boolean;
  settings: Settings;
  /** Published timetable metas, newest last. Drives the building picker. */
  metas: ReturnType<typeof toTimetableMeta>[];
  timetables: Record<string, Timetable>;
  substitutions: Record<ISODate, DaySubstitutions>;
  syncStatus: SyncStatus;
  lastSyncAt: ISODateTime | null;
  lastError: string | null;

  hydrate: () => Promise<void>;
  refresh: (options?: { date?: ISODate; force?: boolean }) => Promise<void>;
  setClass: (classId: string | null) => Promise<void>;
  setBuilding: (building: Building | null) => Promise<void>;
  toggleFavorite: (classId: string) => Promise<void>;
  setTheme: (theme: Settings["theme"]) => Promise<void>;
  setLang: (lang: Settings["lang"]) => Promise<void>;
  setMergeConsecutiveLessons: (merge: boolean) => Promise<void>;
  resolvedDay: (date: ISODate, classId?: string) => ResolvedDay | null;
};

export type StoreDeps = { cache: AppCache; engine: SyncEngine };

/**
 * `resolvedDay` runs the whole merge, so it is memoised on everything that can change its
 * output. Without this every render of a week view would re-merge seven days.
 */
const createResolveMemo = () => {
  const memo = new Map<string, ResolvedDay>();
  return {
    get: (key: string) => memo.get(key),
    set: (key: string, value: ResolvedDay) => {
      // Small bound: a week view touches ~7 entries, a month of browsing far fewer than 200.
      if (memo.size > 200) memo.clear();
      memo.set(key, value);
      return value;
    },
    clear: () => {
      memo.clear();
    },
  };
};

export const createAppStore = ({ cache, engine }: StoreDeps) => {
  const memo = createResolveMemo();

  return createStore<AppState>()((set, get) => {
    const persist = async (patch: Partial<Settings>): Promise<void> => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      memo.clear();
      await cache.putSettings(settings);
    };

    /** Pulls everything the cache currently holds into state. */
    const readCache = async (): Promise<void> => {
      const [settings, list] = await Promise.all([cache.getSettings(), cache.getTimetableList()]);
      const metas =
        list === null ? [] : list.entries.map((e) => toTimetableMeta(e, list.fetchedAt));

      const nums = await cache.listTimetableNums();
      const loaded = await Promise.all(nums.map((n) => cache.getTimetable(n)));
      const timetables: Record<string, Timetable> = {};
      for (const t of loaded) if (t !== null) timetables[t.meta.ttNum] = t;

      // Every cached day, not a window around "today": the week view browses freely, and a
      // day left out here renders its cancelled lessons as if nothing had changed. Retention
      // (`SUBSTITUTION_RETENTION_DAYS`) is what bounds this, not the calendar.
      const dates = await cache.listSubstitutionDates();
      const days = await Promise.all(dates.map((d) => cache.getSubstitutions(d)));
      const substitutions: Record<ISODate, DaySubstitutions> = {};
      for (const day of days) if (day !== null) substitutions[day.date] = day;

      memo.clear();
      set({ settings, metas, timetables, substitutions, ready: true });
    };

    return {
      ready: false,
      settings: { ...DEFAULT_SETTINGS },
      metas: [],
      timetables: {},
      substitutions: {},
      syncStatus: "idle",
      lastSyncAt: null,
      lastError: null,

      hydrate: readCache,

      refresh: async (options = {}) => {
        set({ syncStatus: "syncing" });
        const outcome = await engine.sync({
          ...(options.date === undefined ? {} : { date: options.date }),
          ...(options.force === undefined ? {} : { force: options.force }),
          building: get().settings.building,
        });
        await readCache();
        set({
          syncStatus: outcome.status,
          // Keep the previous timestamp on a failed sync: "updated 2h ago" beats "never".
          lastSyncAt: outcome.lastSyncAt ?? get().lastSyncAt,
          lastError: outcome.errors[0] ?? null,
        });
      },

      setClass: (classId) => persist({ selectedClassId: classId }),
      setBuilding: (building) => persist({ building }),
      setTheme: (theme) => persist({ theme }),
      setLang: (lang) => persist({ lang }),
      setMergeConsecutiveLessons: (mergeConsecutiveLessons) =>
        persist({ mergeConsecutiveLessons }),
      toggleFavorite: (classId) => {
        const favorites = get().settings.favorites;
        return persist({
          favorites: favorites.includes(classId)
            ? favorites.filter((id) => id !== classId)
            : [...favorites, classId],
        });
      },

      resolvedDay: (date, classId) => {
        const state = get();
        const id = classId ?? state.settings.selectedClassId;
        if (id === null || id === undefined) return null;

        const selection = selectTimetable(state.metas, date, state.settings.building ?? undefined);
        if (selection === null) return null;

        const timetable = state.timetables[selection.meta.ttNum];
        if (timetable === undefined) return null;

        const subs = state.substitutions[date] ?? null;
        const key = `${selection.meta.ttNum}|${id}|${date}|${subs?.fetchedAt ?? "none"}`;
        const hit = memo.get(key);
        if (hit !== undefined) return hit;

        return memo.set(key, resolveDay(timetable, subs, id, date, { stale: selection.stale }));
      },
    };
  });
};
