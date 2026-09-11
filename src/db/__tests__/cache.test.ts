/**
 * One contract, both implementations. The memory cache is the test/fallback path and the
 * idb cache is what actually runs on device — they must behave identically or the fallback
 * would silently change semantics.
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createIdbCache,
  createMemoryCache,
  DEFAULT_SETTINGS,
  type AppCache,
  type EdupageDB,
} from "../index.ts";
import { openDB } from "idb";
import type { DaySubstitutions, Timetable } from "../../lib/edupage/index.ts";

const timetable = (ttNum: string): Timetable => ({
  meta: {
    ttNum,
    building: "Galvenā ēka",
    validFrom: "2026-09-07",
    validTo: "2026-09-11",
    label: `Galvenā ēka ${ttNum}`,
    schoolYear: 2026,
    fetchedAt: "2026-09-09T00:00:00.000Z",
  },
  periods: [],
  classes: [],
  teachers: [],
  subjects: [],
  rooms: [],
  lessons: [],
});

const substitutions = (date: string): DaySubstitutions => ({
  date,
  mode: "classes",
  notes: [],
  items: [],
  fetchedAt: "2026-09-09T00:00:00.000Z",
});

/** A fresh IndexedDB per test, so ordering cannot leak state between cases. */
let dbCounter = 0;
const freshIdbCache = (): AppCache => {
  dbCounter += 1;
  const db = openDB<EdupageDB>(`test-db-${String(dbCounter)}`, 1, {
    upgrade(d) {
      d.createObjectStore("meta");
      d.createObjectStore("timetables");
      d.createObjectStore("substitutions");
      d.createObjectStore("settings");
    },
  });
  return createIdbCache(db);
};

const implementations: [name: string, make: () => AppCache][] = [
  ["memory", createMemoryCache],
  ["idb", freshIdbCache],
];

describe.each(implementations)("AppCache — %s", (_name, make) => {
  let cache: AppCache;
  beforeEach(() => {
    cache = make();
  });

  it("returns null for anything not cached yet", async () => {
    expect(await cache.getTimetableList()).toBeNull();
    expect(await cache.getTimetable("1175")).toBeNull();
    expect(await cache.getSubstitutions("2026-09-09")).toBeNull();
    expect(await cache.listTimetableNums()).toEqual([]);
    expect(await cache.listSubstitutionDates()).toEqual([]);
  });

  it("lists cached substitution days in date order", async () => {
    for (const d of ["2026-09-09", "2026-09-01", "2026-09-10"]) {
      await cache.putSubstitutions(substitutions(d));
    }
    expect(await cache.listSubstitutionDates()).toEqual(["2026-09-01", "2026-09-09", "2026-09-10"]);
    await cache.pruneSubstitutions("2026-09-09");
    expect(await cache.listSubstitutionDates()).toEqual(["2026-09-09", "2026-09-10"]);
  });

  it("defaults settings rather than returning undefined", async () => {
    expect(await cache.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips the timetable list", async () => {
    const list = {
      entries: [{ tt_num: "1175", year: 2026, text: "x", datefrom: "2026-09-07" }],
      defaultNum: "1175",
      fetchedAt: "2026-09-09T00:00:00.000Z",
    };
    await cache.putTimetableList(list);
    expect(await cache.getTimetableList()).toEqual(list);
  });

  it("round-trips timetables keyed by tt_num", async () => {
    await cache.putTimetable(timetable("1175"));
    await cache.putTimetable(timetable("1174"));
    expect((await cache.getTimetable("1175"))?.meta.ttNum).toBe("1175");
    expect((await cache.listTimetableNums()).sort()).toEqual(["1174", "1175"]);
  });

  it("overwrites rather than duplicating on re-put", async () => {
    await cache.putTimetable(timetable("1175"));
    await cache.putTimetable(timetable("1175"));
    expect(await cache.listTimetableNums()).toEqual(["1175"]);
  });

  it("round-trips settings", async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      selectedClassId: "-927",
      building: "TIC",
      favorites: ["-927", "-928"],
      theme: "dark" as const,
      lang: "en" as const,
    };
    await cache.putSettings(settings);
    expect(await cache.getSettings()).toEqual(settings);
  });

  it("prunes substitutions strictly older than the cutoff", async () => {
    for (const d of ["2026-08-20", "2026-08-25", "2026-09-01", "2026-09-09"]) {
      await cache.putSubstitutions(substitutions(d));
    }
    expect(await cache.pruneSubstitutions("2026-09-01")).toBe(2);
    expect(await cache.getSubstitutions("2026-08-25")).toBeNull();
    expect(await cache.getSubstitutions("2026-09-01")).not.toBeNull(); // cutoff is exclusive
    expect(await cache.getSubstitutions("2026-09-09")).not.toBeNull();
  });

  it("prunes nothing when everything is recent", async () => {
    await cache.putSubstitutions(substitutions("2026-09-09"));
    expect(await cache.pruneSubstitutions("2026-08-26")).toBe(0);
  });

  it("clears every store", async () => {
    await cache.putTimetable(timetable("1175"));
    await cache.putSubstitutions(substitutions("2026-09-09"));
    await cache.putSettings({ ...DEFAULT_SETTINGS, selectedClassId: "-927" });
    await cache.clear();

    expect(await cache.listTimetableNums()).toEqual([]);
    expect(await cache.getSubstitutions("2026-09-09")).toBeNull();
    expect(await cache.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
