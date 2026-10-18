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
  toTimetableMeta,
  type Building,
  type DaySubstitutions,
  type ISODate,
  type ISODateTime,
  type ResolvedDay,
  type ResolvedTeacherDay,
  type Timetable,
} from "@/lib/edupage";
import {
  DEFAULT_SETTINGS,
  type AppCache,
  type Settings,
  type SubjectNote,
  type TransitDestination,
} from "@/db";
import type { SyncEngine, SyncOutcome, SyncStatus } from "@/sync";
import { noopAnalytics, type AnalyticsClient } from "@/lib/analytics";
import {
  planClassDay,
  planDay,
  planTeacherDay,
  resolveIdentity,
  resolveSubject,
  subjectLabel,
  type AnyDayPlan,
  type DayPlan,
  type DirectorySnapshot,
  type Identity,
  type PersonaSubject,
} from "@/lib/persona";
import type { FetchForecast, WeatherForecast } from "@/lib/weather";

/**
 * Where a tapped notification wants the app to go. Set by the notification-tap listener
 * (`notifications/wire.ts`), consumed once by the shell (`App.tsx`) and cleared — the store
 * doesn't know or care what kind of notification produced it.
 */
export type NotificationNavigationTarget =
  { tab: "home" | "changes"; date: ISODate } | { tab: "settings" };

export type AppState = {
  ready: boolean;
  settings: Settings;
  /** Published timetable metas, newest last. Drives the building picker. */
  metas: ReturnType<typeof toTimetableMeta>[];
  timetables: Record<string, Timetable>;
  substitutions: Record<ISODate, DaySubstitutions>;
  /** Keyed by subject label — see `useSubjects.ts`'s `subjectKey` (`name || short`). */
  notes: Record<string, SubjectNote>;
  /** The last Riga forecast, cached like the timetable; `null` until one has ever arrived. */
  weather: WeatherForecast | null;
  syncStatus: SyncStatus;
  lastSyncAt: ISODateTime | null;
  lastError: string | null;
  /**
   * Bumps once per *forced* refresh that landed cleanly. A counter rather than a flag so two
   * pulls in a row each announce themselves; the UI watches it for the "updated" confirmation.
   */
  manualRefreshCount: number;
  pendingNavigation: NotificationNavigationTarget | null;

  hydrate: () => Promise<void>;
  refresh: (options?: {
    date?: ISODate;
    scope?: "day" | "week";
    force?: boolean;
  }) => Promise<SyncOutcome>;
  /**
   * The device's own connectivity (`lib/network`), wired in from `watchConnectivity` — not a
   * second, parallel "offline" concept next to `syncStatus`. Losing connectivity sets
   * `syncStatus` to `"offline"` immediately, without waiting for a fetch to fail; regaining it
   * triggers a `refresh()`, whose outcome is what actually settles `syncStatus` afterwards (still
   * `"offline"` if the network reports connected but the school is unreachable, `"idle"` once a
   * sync actually lands). `syncStatus` stays the single source of truth the UI reads.
   */
  setConnectivity: (online: boolean) => void;
  setClass: (classId: string | null) => Promise<void>;
  setBuilding: (building: Building | null) => Promise<void>;
  setCommuteHome: (value: string) => Promise<void>;
  setTransitDestinations: (value: TransitDestination[]) => Promise<void>;
  setTransitMapEnabled: (value: boolean) => Promise<void>;
  setWeatherEnabled: (enabled: boolean) => Promise<void>;
  /** `null` shows every division merged — only meaningful for the currently selected class. */
  setSubgroup: (subgroup: string | null) => Promise<void>;
  setPersona: (persona: Settings["persona"]) => Promise<void>;
  setTeacher: (teacherId: string | null) => Promise<void>;
  setTeacherView: (view: Settings["teacherView"]) => Promise<void>;
  setHighlightCoverLessons: (highlight: boolean) => Promise<void>;
  toggleFavorite: (classId: string) => Promise<void>;
  setTheme: (theme: Settings["theme"]) => Promise<void>;
  setLang: (lang: Settings["lang"]) => Promise<void>;
  setMergeConsecutiveLessons: (merge: boolean) => Promise<void>;
  setShowMovedOnTargetDay: (show: boolean) => Promise<void>;
  setShowTime: (showTime: boolean) => Promise<void>;
  setShowSubjectsTab: (showSubjectsTab: boolean) => Promise<void>;
  setShowTransitTab: (showTransitTab: boolean) => Promise<void>;
  setLessonCardStyle: (style: Settings["lessonCardStyle"]) => Promise<void>;
  setCardRadius: (radius: Settings["cardRadius"]) => Promise<void>;
  setCardElevation: (elevation: Settings["cardElevation"]) => Promise<void>;
  setReduceMotion: (reduceMotion: boolean) => Promise<void>;
  setAppAccent: (accent: Settings["appAccent"]) => Promise<void>;
  setSubjectColorCodingEnabled: (enabled: boolean) => Promise<void>;
  /** `tone` of `null` clears the override, returning the subject to its auto-assigned tone. */
  setSubjectColorOverride: (
    subjectKey: string,
    tone: Settings["subjectColorOverrides"][string] | null,
  ) => Promise<void>;
  /** Restores every Customization sheet setting — not the rest of `Settings` — to its default. */
  resetCustomization: () => Promise<void>;
  /** Clears all user-specific data (settings, notes) and restores default settings, keeping timetables. */
  resetAllData: () => Promise<void>;
  setNotifyLessonReminderMinutes: (minutes: number) => Promise<void>;
  setNotifySubstitutionChanges: (enabled: boolean) => Promise<void>;
  setNotifyNewTimetable: (enabled: boolean) => Promise<void>;
  setNotifyAppUpdates: (enabled: boolean) => Promise<void>;
  /** Not user-facing — the update-notification wiring marks a version as already announced. */
  setLastNotifiedUpdateVersion: (version: string) => Promise<void>;
  /** Not user-facing — the what's-new sheet marks this build's notes as read. */
  setLastSeenChangelogVersion: (version: string) => Promise<void>;
  setAnalyticsEnabled: (enabled: boolean) => Promise<void>;
  /** Pins the share card to `lang`, which also stops it following the app language. */
  setShareLang: (lang: Settings["shareLang"]) => Promise<void>;
  setShareLangSyncWithApp: (sync: boolean) => Promise<void>;
  /** Not user-facing — `useShareWeek` marks the one-time language prompt as already shown. */
  setShareLangPromptShown: (shown: boolean) => Promise<void>;
  /** Not user-facing — `boot.ts` calls this once per launch, alongside the `app_open` event. */
  recordAppOpen: () => Promise<void>;
  setFeedbackPromptDismissed: (dismissed: boolean) => Promise<void>;
  setTeacherAnnouncementDismissed: (dismissed: boolean) => Promise<void>;
  setIphoneInstallPromptDismissed: (dismissed: boolean) => Promise<void>;
  setAndroidApkBannerDismissed: (dismissed: boolean) => Promise<void>;
  setNote: (subject: string, text: string) => Promise<void>;
  deleteNote: (subject: string) => Promise<void>;
  setPendingNavigation: (target: NotificationNavigationTarget) => void;
  clearPendingNavigation: () => void;
  /** No-op when the user has opted out. Screen views, manual refreshes — nothing PII-bearing. */
  trackEvent: (event: string) => void;
  resolvedDay: (date: ISODate, classId?: string) => ResolvedDay | null;
  resolvedTeacherDay: (date: ISODate, teacherId?: string) => ResolvedTeacherDay | null;
  /**
   * The selected class's display short ("1DP1"), or `null` while none is picked or no cached
   * timetable knows that id yet. The substitution feed only ever speaks in these shorts — the
   * EduPage id in `settings.selectedClassId` means nothing to it — so anything matching against
   * the feed (the Web Push registration, in particular) has to go through here.
   */
  selectedClassShort: () => string | null;
  /**
   * The active role and only its selection (`lib/persona`). A fresh object per call — React
   * code reads it through `ui/persona`'s `useIdentity`, which memoises on the primitives.
   */
  identity: () => Identity;
  /**
   * The active role resolved against the cached timetables (`lib/persona`'s `resolveSubject`):
   * refs, display label, feed key, form class. `null` while nothing is picked.
   */
  subject: () => PersonaSubject | null;
  /**
   * Whom the active role is keyed by, by the name the substitution feed uses: the class
   * short for a student, the teacher's short (or full name) for a teacher. `null` while
   * nothing is picked or no cached timetable knows the pick yet. Web Push files a device
   * under this (hashed, for a teacher).
   */
  identityLabel: () => string | null;
};

/** The slice of state `lib/persona`'s directory resolves days from. */
const snapshotOf = (state: AppState): DirectorySnapshot => ({
  identity: state.identity(),
  metas: state.metas,
  timetables: state.timetables,
  substitutions: state.substitutions,
  building: state.settings.building,
  showMovedOnTargetDay: state.settings.showMovedOnTargetDay,
});

export type StoreDeps = {
  cache: AppCache;
  engine: SyncEngine;
  analytics?: AnalyticsClient;
  /** Absent in tests and anywhere weather is not wanted: nothing is fetched then. */
  weather?: FetchForecast;
  now?: () => Date;
};

/** A forecast younger than this is not re-fetched by a routine refresh (open, resume). */
export const WEATHER_TTL_MS = 30 * 60_000;
/** Even a pull-to-refresh leaves a forecast this fresh alone — the sky did not change. */
export const WEATHER_FORCE_TTL_MS = 5 * 60_000;

/**
 * `resolvedDay` runs the whole merge, so it is memoised on everything that can change its
 * output — the key comes with the plan (`lib/persona`'s `planDay`), so it can't miss an input.
 * Without this every render of a week view would re-merge seven days.
 */
const createResolveMemo = <T extends ResolvedDay>() => {
  const memo = new Map<string, T>();
  return {
    through: (plan: DayPlan<T> | null): T | null => {
      if (plan === null) return null;
      const hit = memo.get(plan.key);
      if (hit !== undefined) return hit;
      // Small bound: a week view touches ~7 entries, a month of browsing far fewer than 200.
      if (memo.size > 200) memo.clear();
      const value = plan.resolve();
      memo.set(plan.key, value);
      return value;
    },
    clear: () => {
      memo.clear();
    },
  };
};

export const createAppStore = ({
  cache,
  engine,
  analytics = noopAnalytics,
  weather: fetchWeather,
  now = () => new Date(),
}: StoreDeps) => {
  // Separate maps per result type, so a teacher day never has to be cast back out of a class one.
  const classMemo = createResolveMemo<ResolvedDay>();
  const teacherMemo = createResolveMemo<ResolvedTeacherDay>();
  const memo = {
    clear: () => {
      classMemo.clear();
      teacherMemo.clear();
    },
  };
  const runPlan = (plan: AnyDayPlan | null): ResolvedDay | null =>
    plan === null
      ? null
      : plan.kind === "teacher"
        ? teacherMemo.through(plan)
        : classMemo.through(plan);

  return createStore<AppState>()((set, get) => {
    const persist = async (patch: Partial<Settings>): Promise<void> => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      memo.clear();
      await cache.putSettings(settings);
    };

    /**
     * Refreshes the forecast when it is old enough to be worth a request. Never throws and
     * never touches `syncStatus`: weather is a garnish, its failure is not the timetable's.
     */
    const refreshWeather = async (force: boolean): Promise<void> => {
      if (fetchWeather === undefined || !get().settings.weatherEnabled) return;
      const current = get().weather;
      const age = current === null ? Infinity : now().getTime() - Date.parse(current.fetchedAt);
      if (age < (force ? WEATHER_FORCE_TTL_MS : WEATHER_TTL_MS)) return;
      const next = await fetchWeather().catch(() => null);
      if (next === null) return;
      set({ weather: next });
      await cache.putWeather(next).catch(() => {});
    };

    /** Pulls everything the cache currently holds into state. */
    const readCache = async (): Promise<void> => {
      const [settings, list, weather] = await Promise.all([
        cache.getSettings(),
        cache.getTimetableList(),
        cache.getWeather().catch(() => null),
      ]);
      const metas =
        list === null ? [] : list.entries.map((e) => toTimetableMeta(e, list.fetchedAt));

      // Independent object stores: read them side by side so a cold open costs the slowest
      // read, not the sum of five round trips. Each store lists its keys, then fetches them all.
      const [timetableList, daysList, notesList] = await Promise.all([
        cache
          .listTimetableNums()
          .then((nums) => Promise.all(nums.map((n) => cache.getTimetable(n)))),
        // Every cached day, not a window around "today": the week view browses freely, and a
        // day left out here renders its cancelled lessons as if nothing had changed. Retention
        // (`SUBSTITUTION_RETENTION_DAYS`) is what bounds this, not the calendar.
        cache
          .listSubstitutionDates()
          .then((dates) => Promise.all(dates.map((d) => cache.getSubstitutions(d)))),
        cache
          .listNoteSubjects()
          .then((subjects) => Promise.all(subjects.map((s) => cache.getNote(s)))),
      ]);
      const timetables: Record<string, Timetable> = {};
      for (const t of timetableList) if (t !== null) timetables[t.meta.ttNum] = t;
      const substitutions: Record<ISODate, DaySubstitutions> = {};
      for (const day of daysList) if (day !== null) substitutions[day.date] = day;
      const notes: Record<string, SubjectNote> = {};
      for (const note of notesList) if (note !== null) notes[note.subject] = note;

      memo.clear();
      set({
        settings,
        metas,
        timetables,
        substitutions,
        notes,
        // A forecast fetched since the read began is newer than the cached one; keep it.
        weather: get().weather ?? weather,
        ready: true,
      });
    };

    return {
      ready: false,
      settings: { ...DEFAULT_SETTINGS },
      metas: [],
      timetables: {},
      substitutions: {},
      notes: {},
      weather: null,
      syncStatus: "idle",
      lastSyncAt: null,
      lastError: null,
      manualRefreshCount: 0,
      pendingNavigation: null,

      hydrate: readCache,

      refresh: async (options = {}) => {
        if (options.force === true) get().trackEvent("manual_refresh");
        set({ syncStatus: "syncing" });
        const weather = refreshWeather(options.force === true);
        const outcome = await engine.sync({
          ...(options.date === undefined ? {} : { date: options.date }),
          ...(options.scope === undefined ? {} : { scope: options.scope }),
          ...(options.force === undefined ? {} : { force: options.force }),
          building: get().settings.building,
        });
        await Promise.all([readCache(), weather]);
        set({
          syncStatus: outcome.status,
          // Keep the previous timestamp on a failed sync: "updated 2h ago" beats "never".
          lastSyncAt: outcome.lastSyncAt ?? get().lastSyncAt,
          lastError: outcome.errors[0] ?? null,
          // Routine refreshes (open, resume, reconnect) stay silent; only a user's own pull,
          // tap or settings button earns a confirmation, and only when it actually succeeded.
          ...(options.force === true && outcome.status === "idle"
            ? { manualRefreshCount: get().manualRefreshCount + 1 }
            : {}),
        });
        return outcome;
      },

      setConnectivity: (online) => {
        if (online) {
          void get().refresh();
        } else {
          set({ syncStatus: "offline" });
        }
      },

      // A subgroup label from the previous class means nothing for the new one, so it resets.
      setClass: (classId) => persist({ selectedClassId: classId, subgroup: null }),
      setBuilding: (building) => persist({ building }),
      setCommuteHome: (commuteHome) => persist({ commuteHome }),
      setTransitDestinations: (transitDestinations) => persist({ transitDestinations }),
      setTransitMapEnabled: (transitMapEnabled) => persist({ transitMapEnabled }),
      setWeatherEnabled: async (weatherEnabled) => {
        await persist({ weatherEnabled });
        // Switched back on: fetch now rather than waiting for the next open or resume.
        if (weatherEnabled) await refreshWeather(false);
      },
      setSubgroup: (subgroup) => persist({ subgroup }),
      setPersona: (persona) => persist({ persona }),
      setTeacher: (selectedTeacherId) => persist({ selectedTeacherId, teacherView: "own" }),
      setTeacherView: (teacherView) => persist({ teacherView }),
      setHighlightCoverLessons: (highlightCoverLessons) => persist({ highlightCoverLessons }),
      setTheme: (theme) => persist({ theme }),
      setLang: (lang) => persist({ lang }),
      setMergeConsecutiveLessons: (mergeConsecutiveLessons) => persist({ mergeConsecutiveLessons }),
      setShowMovedOnTargetDay: (showMovedOnTargetDay) => persist({ showMovedOnTargetDay }),
      setShowTime: (showTime) => persist({ showTime }),
      setShowSubjectsTab: (showSubjectsTab) => persist({ showSubjectsTab }),
      setShowTransitTab: (showTransitTab) => persist({ showTransitTab }),
      setLessonCardStyle: (lessonCardStyle) => persist({ lessonCardStyle }),
      setCardRadius: (cardRadius) => persist({ cardRadius }),
      setCardElevation: (cardElevation) => persist({ cardElevation }),
      setReduceMotion: (reduceMotion) => persist({ reduceMotion }),
      setAppAccent: (appAccent) => persist({ appAccent }),
      setSubjectColorCodingEnabled: (subjectColorCodingEnabled) =>
        persist({ subjectColorCodingEnabled }),
      setSubjectColorOverride: (subjectKey, tone) => {
        const next = { ...get().settings.subjectColorOverrides };
        if (tone === null) delete next[subjectKey];
        else next[subjectKey] = tone;
        return persist({ subjectColorOverrides: next });
      },
      resetCustomization: () =>
        persist({
          theme: DEFAULT_SETTINGS.theme,
          lessonCardStyle: DEFAULT_SETTINGS.lessonCardStyle,
          cardRadius: DEFAULT_SETTINGS.cardRadius,
          cardElevation: DEFAULT_SETTINGS.cardElevation,
          reduceMotion: DEFAULT_SETTINGS.reduceMotion,
          appAccent: DEFAULT_SETTINGS.appAccent,
          subjectColorCodingEnabled: DEFAULT_SETTINGS.subjectColorCodingEnabled,
          subjectColorOverrides: { ...DEFAULT_SETTINGS.subjectColorOverrides },
        }),
      resetAllData: async () => {
        await cache.clearUserData();
        await readCache();
      },
      setNotifyLessonReminderMinutes: (notifyLessonReminderMinutes) =>
        persist({ notifyLessonReminderMinutes }),
      setNotifySubstitutionChanges: (notifySubstitutionChanges) =>
        persist({ notifySubstitutionChanges }),
      setNotifyNewTimetable: (notifyNewTimetable) => persist({ notifyNewTimetable }),
      setNotifyAppUpdates: (notifyAppUpdates) => persist({ notifyAppUpdates }),
      setLastNotifiedUpdateVersion: (lastNotifiedUpdateVersion) =>
        persist({ lastNotifiedUpdateVersion }),
      setLastSeenChangelogVersion: (lastSeenChangelogVersion) =>
        persist({ lastSeenChangelogVersion }),
      setAnalyticsEnabled: (analyticsEnabled) => persist({ analyticsEnabled }),
      setShareLang: (shareLang) => persist({ shareLang, shareLangSyncWithApp: false }),
      setShareLangSyncWithApp: (shareLangSyncWithApp) => persist({ shareLangSyncWithApp }),
      setShareLangPromptShown: (shareLangPromptShown) => persist({ shareLangPromptShown }),
      recordAppOpen: () => persist({ appOpenCount: get().settings.appOpenCount + 1 }),
      setFeedbackPromptDismissed: (feedbackPromptDismissed) => persist({ feedbackPromptDismissed }),
      setTeacherAnnouncementDismissed: (teacherAnnouncementDismissed) =>
        persist({ teacherAnnouncementDismissed }),
      setIphoneInstallPromptDismissed: (iphoneInstallPromptDismissed) =>
        persist({ iphoneInstallPromptDismissed }),
      setAndroidApkBannerDismissed: (androidApkBannerDismissed) =>
        persist({ androidApkBannerDismissed }),
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
      setPendingNavigation: (target) => {
        set({ pendingNavigation: target });
      },
      clearPendingNavigation: () => {
        set({ pendingNavigation: null });
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

      selectedClassShort: () => {
        const subject = get().subject();
        return subject?.persona === "student" ? subject.class.label : null;
      },

      identity: () => resolveIdentity(get().settings),

      subject: () => resolveSubject(get().identity(), Object.values(get().timetables)),

      identityLabel: () => subjectLabel(get().subject()),

      resolvedTeacherDay: (date, teacherId) => {
        const id = teacherId ?? get().settings.selectedTeacherId;
        if (id === null) return null;
        return teacherMemo.through(planTeacherDay(snapshotOf(get()), date, id));
      },

      resolvedDay: (date, classId) => {
        const snapshot = snapshotOf(get());
        return classId === undefined
          ? runPlan(planDay(snapshot, date))
          : classMemo.through(planClassDay(snapshot, date, classId));
      },
    };
  });
};
