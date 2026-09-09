/**
 * The cache port. `sync/` and `store/` depend on this interface, never on `idb` directly,
 * so both are testable without a browser and the app can fall back to memory when
 * IndexedDB is unavailable (private mode, an old WebView).
 */
import type {
  Building,
  DaySubstitutions,
  ISODate,
  ISODateTime,
  Timetable,
} from "../lib/edupage/index.ts";
import type { RawTimetableListEntry } from "../lib/edupage/index.ts";

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
  lang: "lv" | "en" | "ru";
};

export const DEFAULT_SETTINGS: Settings = {
  selectedClassId: null,
  building: null,
  favorites: [],
  theme: "system",
  lang: "lv",
};

export type AppCache = {
  getTimetableList: () => Promise<CachedTimetableList | null>;
  putTimetableList: (list: CachedTimetableList) => Promise<void>;

  getTimetable: (ttNum: string) => Promise<Timetable | null>;
  putTimetable: (timetable: Timetable) => Promise<void>;
  listTimetableNums: () => Promise<string[]>;

  getSubstitutions: (date: ISODate) => Promise<DaySubstitutions | null>;
  putSubstitutions: (day: DaySubstitutions) => Promise<void>;
  /** Drops cached days strictly before `date`. Returns how many were removed. */
  pruneSubstitutions: (date: ISODate) => Promise<number>;

  getSettings: () => Promise<Settings>;
  putSettings: (settings: Settings) => Promise<void>;

  clear: () => Promise<void>;
};
