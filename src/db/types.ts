/**
 * The cache port. `sync/` and `store/` depend on this interface, never on `idb` directly,
 * so both are testable without a browser and the app can fall back to memory when
 * IndexedDB is unavailable (private mode, an old WebView).
 */
import type { Building, DaySubstitutions, ISODate, ISODateTime, Timetable } from "@/lib/edupage";
import type { RawTimetableListEntry } from "@/lib/edupage";

export type CachedTimetableList = {
  entries: RawTimetableListEntry[];
  defaultNum: string | null;
  fetchedAt: ISODateTime;
};

export type Settings = {
  selectedClassId: string | null;
  building: Building | null;
  /** Class ids the user pinned; notifications in Phase 4 key off these. */
  favorites: string[];
  theme: "system" | "light" | "dark";
  lang: "lv" | "en" | "ru" | "ua";
  /** Week view: collapse a run of consecutive identical lessons into one tall block. */
  mergeConsecutiveLessons: boolean;
  /** Day view: show each lesson's start/end time alongside its number. */
  showTime: boolean;
  /** Minutes before a lesson to notify at; 0 turns the reminder off. */
  notifyLessonReminderMinutes: number;
  /** Notify when today's or tomorrow's substitutions change after the initial load. */
  notifySubstitutionChanges: boolean;
  /** Notify once a new GitHub release is available. */
  notifyAppUpdates: boolean;
  /** Latest release tag already notified about — prevents repeat pings for the same version. */
  lastNotifiedUpdateVersion: string | null;
  /**
   * The *installed* build whose release notes this device has already been shown. Distinct
   * from `lastNotifiedUpdateVersion`, which tracks a remote tag the user was told about but
   * may never have installed. `null` means "never marked" — see `entriesSince`.
   */
  lastSeenChangelogVersion: string | null;
  /** Anonymous usage analytics (Plausible). No cookies, no persistent id — opt-out, not opt-in. */
  analyticsEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  selectedClassId: null,
  building: null,
  favorites: [],
  theme: "system",
  lang: "lv",
  mergeConsecutiveLessons: false,
  showTime: false,
  notifyLessonReminderMinutes: 10,
  notifySubstitutionChanges: true,
  notifyAppUpdates: true,
  lastNotifiedUpdateVersion: null,
  lastSeenChangelogVersion: null,
  analyticsEnabled: true,
};

export type SubjectNote = {
  /** Subject label — see `useSubjects.ts`: `name || short`, the app's stable cross-week key. */
  subject: string;
  text: string;
  updatedAt: ISODateTime;
};

export type AppCache = {
  getTimetableList: () => Promise<CachedTimetableList | null>;
  putTimetableList: (list: CachedTimetableList) => Promise<void>;

  getTimetable: (ttNum: string) => Promise<Timetable | null>;
  putTimetable: (timetable: Timetable) => Promise<void>;
  listTimetableNums: () => Promise<string[]>;

  getSubstitutions: (date: ISODate) => Promise<DaySubstitutions | null>;
  putSubstitutions: (day: DaySubstitutions) => Promise<void>;
  /**
   * Every day currently cached, ascending. Retention keeps this small (a fortnight back plus
   * the next school day), and the store loads all of them: a fixed window around "today"
   * would hide substitutions the device already holds for any other date the user browses to.
   */
  listSubstitutionDates: () => Promise<ISODate[]>;
  /** Drops cached days strictly before `date`. Returns how many were removed. */
  pruneSubstitutions: (date: ISODate) => Promise<number>;

  getSettings: () => Promise<Settings>;
  putSettings: (settings: Settings) => Promise<void>;

  getNote: (subject: string) => Promise<SubjectNote | null>;
  putNote: (note: SubjectNote) => Promise<void>;
  deleteNote: (subject: string) => Promise<void>;
  listNoteSubjects: () => Promise<string[]>;

  clear: () => Promise<void>;
};
