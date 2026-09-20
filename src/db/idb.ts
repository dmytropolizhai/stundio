/**
 * IndexedDB implementation of `AppCache`.
 *
 * Everything cached here is re-derivable from the network, so a failed upgrade is not worth
 * a migration path: bump `DB_VERSION` and recreate the stores. Nothing user-authored lives
 * in the timetable stores — only `settings` is worth preserving, so it survives upgrades.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_SETTINGS,
  type AppCache,
  type CachedTimetableList,
  type Settings,
  type SubjectNote,
} from "./types.ts";
import type { DaySubstitutions, ISODate, Timetable } from "@/lib/edupage";

export const DB_NAME = "rvt-stunda";
export const DB_VERSION = 3;

const LIST_KEY = "timetableList";
const SETTINGS_KEY = "app";

export type EdupageDB = DBSchema & {
  meta: { key: string; value: CachedTimetableList };
  timetables: { key: string; value: Timetable };
  substitutions: { key: ISODate; value: DaySubstitutions };
  settings: { key: string; value: Settings };
  notes: { key: string; value: SubjectNote };
};

export const openAppDb = (): Promise<IDBPDatabase<EdupageDB>> =>
  openDB<EdupageDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("timetables")) db.createObjectStore("timetables");
      if (!db.objectStoreNames.contains("substitutions")) db.createObjectStore("substitutions");
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      // User-authored, like settings: created on upgrade too, never dropped and recreated.
      if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes");
    },
  });

export const createIdbCache = (
  dbPromise: Promise<IDBPDatabase<EdupageDB>> = openAppDb(),
): AppCache => ({
  getTimetableList: async () => (await (await dbPromise).get("meta", LIST_KEY)) ?? null,
  putTimetableList: async (list) => {
    await (await dbPromise).put("meta", list, LIST_KEY);
  },

  getTimetable: async (ttNum) => (await (await dbPromise).get("timetables", ttNum)) ?? null,
  putTimetable: async (timetable) => {
    await (await dbPromise).put("timetables", timetable, timetable.meta.ttNum);
  },
  listTimetableNums: async () => (await (await dbPromise).getAllKeys("timetables")).map(String),

  getSubstitutions: async (date) => (await (await dbPromise).get("substitutions", date)) ?? null,
  putSubstitutions: async (day) => {
    await (await dbPromise).put("substitutions", day, day.date);
  },
  // IndexedDB returns keys in key order, and ISO dates sort lexicographically: already ascending.
  listSubstitutionDates: async () =>
    (await (await dbPromise).getAllKeys("substitutions")).map(String),
  pruneSubstitutions: async (date) => {
    const db = await dbPromise;
    // ISO dates sort lexicographically, so an upper-bound range is exactly "older than".
    const stale = await db.getAllKeys("substitutions", IDBKeyRange.upperBound(date, true));
    const tx = db.transaction("substitutions", "readwrite");
    await Promise.all([...stale.map((k) => tx.store.delete(k)), tx.done]);
    return stale.length;
  },

  getSettings: async () => {
    const stored = await (await dbPromise).get("settings", SETTINGS_KEY);
    // Merge so a settings field added in a later release gets its default.
    return { ...DEFAULT_SETTINGS, ...stored };
  },
  putSettings: async (settings) => {
    await (await dbPromise).put("settings", settings, SETTINGS_KEY);
  },

  getNote: async (subject) => (await (await dbPromise).get("notes", subject)) ?? null,
  putNote: async (note) => {
    await (await dbPromise).put("notes", note, note.subject);
  },
  deleteNote: async (subject) => {
    await (await dbPromise).delete("notes", subject);
  },
  listNoteSubjects: async () => (await (await dbPromise).getAllKeys("notes")).map(String),

  clearUserData: async () => {
    const db = await dbPromise;
    await Promise.all([db.clear("settings"), db.clear("notes")]);
  },

  clear: async () => {
    const db = await dbPromise;
    await Promise.all([
      db.clear("meta"),
      db.clear("timetables"),
      db.clear("substitutions"),
      db.clear("settings"),
      db.clear("notes"),
    ]);
  },
});

/** Real cache when IndexedDB works, memory when it does not (private mode, old WebView). */
export const createCache = async (): Promise<AppCache> => {
  try {
    const db = await openAppDb();
    return createIdbCache(Promise.resolve(db));
  } catch {
    const { createMemoryCache } = await import("./memory.ts");
    return createMemoryCache();
  }
};
