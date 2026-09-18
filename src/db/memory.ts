/**
 * In-memory `AppCache`. Used by tests and as the fallback when IndexedDB is unavailable,
 * so the app degrades to "works until you close it" rather than failing outright.
 */
import {
  DEFAULT_SETTINGS,
  type AppCache,
  type CachedTimetableList,
  type Settings,
  type SubjectNote,
} from "./types.ts";
import type { DaySubstitutions, ISODate, Timetable } from "@/lib/edupage";

export const createMemoryCache = (): AppCache => {
  let list: CachedTimetableList | null = null;
  let settings: Settings = { ...DEFAULT_SETTINGS };
  const timetables = new Map<string, Timetable>();
  const substitutions = new Map<ISODate, DaySubstitutions>();
  const notes = new Map<string, SubjectNote>();

  return {
    getTimetableList: () => Promise.resolve(list),
    putTimetableList: (v) => {
      list = v;
      return Promise.resolve();
    },

    getTimetable: (ttNum) => Promise.resolve(timetables.get(ttNum) ?? null),
    putTimetable: (t) => {
      timetables.set(t.meta.ttNum, t);
      return Promise.resolve();
    },
    listTimetableNums: () => Promise.resolve([...timetables.keys()]),

    getSubstitutions: (date) => Promise.resolve(substitutions.get(date) ?? null),
    putSubstitutions: (d) => {
      substitutions.set(d.date, d);
      return Promise.resolve();
    },
    listSubstitutionDates: () => Promise.resolve([...substitutions.keys()].sort()),
    pruneSubstitutions: (date) => {
      let removed = 0;
      for (const key of [...substitutions.keys()]) {
        if (key < date) {
          substitutions.delete(key);
          removed += 1;
        }
      }
      return Promise.resolve(removed);
    },

    getSettings: () => Promise.resolve({ ...settings }),
    putSettings: (s) => {
      settings = { ...s };
      return Promise.resolve();
    },

    getNote: (subject) => Promise.resolve(notes.get(subject) ?? null),
    putNote: (note) => {
      notes.set(note.subject, note);
      return Promise.resolve();
    },
    deleteNote: (subject) => {
      notes.delete(subject);
      return Promise.resolve();
    },
    listNoteSubjects: () => Promise.resolve([...notes.keys()]),

    clearUserData: () => {
      settings = { ...DEFAULT_SETTINGS };
      notes.clear();
      return Promise.resolve();
    },

    clear: () => {
      list = null;
      settings = { ...DEFAULT_SETTINGS };
      timetables.clear();
      substitutions.clear();
      notes.clear();
      return Promise.resolve();
    },
  };
};
