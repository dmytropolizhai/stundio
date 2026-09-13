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

/**
 * One of the Studio DS's six subject accent tones (`ui/theme/colors.ts`'s `SubjectTone`).
 * Duplicated as a literal here rather than imported, the same way `theme` and `lang` are: `db/`
 * stays below `ui/` in the layering (CLAUDE.md), so the six names are the contract between them.
 */
export type SubjectColorTone = "amber" | "sky" | "lilac" | "pink" | "mint" | "lime";

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
  /** Unfilled shows the subject accent only as a rail; filled tints the whole lesson card. */
  lessonCardStyle: "outline" | "filled";
  /** Corner radius for cards, chosen from the DS's own rounder end of the scale. */
  cardRadius: "xl" | "2xl";
  /** Shadow depth for cards and other elevated chrome. */
  cardElevation: "soft" | "bold";
  /** Forces every DS transition/animation to near-zero, independent of the OS preference. */
  reduceMotion: boolean;
  /**
   * Per-subject accent overrides, keyed the same way `subjectTone` keys its hash (lowercased
   * `short`/`name`/`id`). A subject not present here keeps its deterministic auto-assigned tone.
   */
  subjectColorOverrides: Record<string, SubjectColorTone>;
  /** Minutes before a lesson to notify at; 0 turns the reminder off. */
  notifyLessonReminderMinutes: number;
  /** Notify when today's or tomorrow's substitutions change after the initial load. */
  notifySubstitutionChanges: boolean;
  /** Notify once a new GitHub release is available. */
  notifyAppUpdates: boolean;
  /** Latest release tag already notified about — prevents repeat pings for the same version. */
  lastNotifiedUpdateVersion: string | null;
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
  lessonCardStyle: "outline",
  cardRadius: "xl",
  cardElevation: "soft",
  reduceMotion: false,
  subjectColorOverrides: {},
  notifyLessonReminderMinutes: 10,
  notifySubstitutionChanges: true,
  notifyAppUpdates: true,
  lastNotifiedUpdateVersion: null,
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
