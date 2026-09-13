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
  resolveDayAcross,
  selectTimetables,
  toTimetableMeta,
  type Building,
  type DaySubstitutions,
  type ISODate,
  type DaySource,
  type ISODateTime,
  type ResolvedDay,
  type Timetable,
} from "../lib/edupage/index.ts";
import { DEFAULT_SETTINGS, type AppCache, type Settings, type SubjectNote } from "../db/index.ts";
import type { SyncEngine, SyncOutcome, SyncStatus } from "../sync/index.ts";
import { noopAnalytics, type AnalyticsClient } from "../lib/analytics/index.ts";

export type AppState = {
  ready: boolean;
  settings: Settings;
  /** Published timetable metas, newest last. Drives the building picker. */
  metas: ReturnType<typeof toTimetableMeta>[];
  timetables: Record<string, Timetable>;
  substitutions: Record<ISODate, DaySubstitutions>;
  /** Keyed by subject label — see `useSubjects.ts`'s `subjectKey` (`name || short`). */
  notes: Record<string, SubjectNote>;
  syncStatus: SyncStatus;
  lastSyncAt: ISODateTime | null;
  lastError: string | null;

  hydrate: () => Promise<void>;
  refresh: (options?: { date?: ISODate; force?: boolean }) => Promise<SyncOutcome>;
  setClass: (classId: string | null) => Promise<void>;
  setBuilding: (building: Building | null) => Promise<void>;
  toggleFavorite: (classId: string) => Promise<void>;
  setTheme: (theme: Settings["theme"]) => Promise<void>;
  setLang: (lang: Settings["lang"]) => Promise<void>;
  setMergeConsecutiveLessons: (merge: boolean) => Promise<void>;
  setShowTime: (showTime: boolean) => Promise<void>;
  setNotifyLessonReminderMinutes: (minutes: number) => Promise<void>;
  setNotifySubstitutionChanges: (enabled: boolean) => Promise<void>;
  setNotifyAppUpdates: (enabled: boolean) => Promise<void>;
  /** Not user-facing — the update-notification wiring marks a version as already announced. */
  setLastNotifiedUpdateVersion: (version: string) => Promise<void>;
  setAnalyticsEnabled: (enabled: boolean) => Promise<void>;
  setNote: (subject: string, text: string) => Promise<void>;
  deleteNote: (subject: string) => Promise<void>;
  /** No-op when the user has opted out. Screen views, manual refreshes — nothing PII-bearing. */
  trackEvent: (event: string) => void;
  resolvedDay: (date: ISODate, classId?: string) => ResolvedDay | null;
};

export type StoreDeps = { cache: AppCache; engine: SyncEngine; analytics?: AnalyticsClient };

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

export const createAppStore = ({ cache, engine, analytics = noopAnalytics }: StoreDeps) => {
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

      const subjects = await cache.listNoteSubjects();
      const loadedNotes = await Promise.all(subjects.map((s) => cache.getNote(s)));
      const notes: Record<string, SubjectNote> = {};
      for (const note of loadedNotes) if (note !== null) notes[note.subject] = note;

      memo.clear();
      set({ settings, metas, timetables, substitutions, notes, ready: true });
    };

    return {
      ready: false,
      settings: { ...DEFAULT_SETTINGS },
      metas: [],
      timetables: {},
      substitutions: {},
      notes: {},
      syncStatus: "idle",
      lastSyncAt: null,
      lastError: null,

      hydrate: readCache,

      refresh: async (options = {}) => {
        if (options.force === true) get().trackEvent("manual_refresh");
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
        return outcome;
      },

      setClass: (classId) => persist({ selectedClassId: classId }),
      setBuilding: (building) => persist({ building }),
      setTheme: (theme) => persist({ theme }),
      setLang: (lang) => persist({ lang }),
      setMergeConsecutiveLessons: (mergeConsecutiveLessons) => persist({ mergeConsecutiveLessons }),
      setShowTime: (showTime) => persist({ showTime }),
      setNotifyLessonReminderMinutes: (notifyLessonReminderMinutes) =>
        persist({ notifyLessonReminderMinutes }),
      setNotifySubstitutionChanges: (notifySubstitutionChanges) =>
        persist({ notifySubstitutionChanges }),
      setNotifyAppUpdates: (notifyAppUpdates) => persist({ notifyAppUpdates }),
      setLastNotifiedUpdateVersion: (lastNotifiedUpdateVersion) =>
        persist({ lastNotifiedUpdateVersion }),
      setAnalyticsEnabled: (analyticsEnabled) => persist({ analyticsEnabled }),
      setNote: async (subject, text) => {
        const trimmed = text.trim();
        if (trimmed === "") {
          await get().deleteNote(subject);
          return;
        }
        const note: SubjectNote = {
          subject,
          text: trimmed,
          updatedAt: new Date().toISOString(),
        };
        set({ notes: { ...get().notes, [subject]: note } });
        await cache.putNote(note);
      },
      deleteNote: async (subject) => {
        const notes = { ...get().notes };
        delete notes[subject];
        set({ notes });
        await cache.deleteNote(subject);
      },
      trackEvent: (event) => {
        if (get().settings.analyticsEnabled) analytics.track(event);
      },
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

        /*
         * One source per building, not one overall: in automatic mode a class's lessons live in
         * whichever building published them, and the other buildings only carry a pointer row
         * (`resolveDayAcross`). A building the user pinned narrows this to a single source.
         */
        const sources: DaySource[] = selectTimetables(
          state.metas,
          date,
          state.settings.building ?? undefined,
        ).flatMap((selection) => {
          const timetable = state.timetables[selection.meta.ttNum];
          // Not cached yet — `sync` fetches it; until then the other buildings still resolve.
          return timetable === undefined ? [] : [{ timetable, stale: selection.stale }];
        });
        if (sources.length === 0) return null;

        const subs = state.substitutions[date] ?? null;
        const nums = sources.map((s) => s.timetable.meta.ttNum).join(",");
        const key = `${nums}|${id}|${date}|${subs?.fetchedAt ?? "none"}`;
        const hit = memo.get(key);
        if (hit !== undefined) return hit;

        return memo.set(key, resolveDayAcross(sources, subs, id, date));
      },
    };
  });
};
