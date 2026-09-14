/**
 * The real IndexedDB path: the schema `openAppDb` creates, and the memory fallback that
 * keeps the app usable when IndexedDB is blocked (private mode, a locked-down WebView).
 */
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCache, createIdbCache, openAppDb, DB_NAME, DB_VERSION } from "../idb.ts";
import type { IDBPDatabase } from "idb";
import type { EdupageDB } from "../idb.ts";
import { DEFAULT_SETTINGS } from "../types.ts";

/**
 * Every connection must be closed before the database can be deleted, otherwise
 * `deleteDatabase` blocks forever and the next test hangs waiting to open it.
 */
const open = new Set<IDBPDatabase<EdupageDB>>();
const track = async (db: Promise<IDBPDatabase<EdupageDB>>): Promise<IDBPDatabase<EdupageDB>> => {
  const handle = await db;
  open.add(handle);
  return handle;
};

afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of open) db.close();
  open.clear();
  // Best-effort: `createCache` keeps its connection internally, so a delete can stay
  // blocked. Every test writes what it reads, so a surviving database is harmless.
  await Promise.race([
    new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess =
        req.onerror =
        req.onblocked =
          () => {
            resolve();
          };
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 100)),
  ]);
});

describe("openAppDb", () => {
  it("creates all five stores at the declared version", async () => {
    const db = await track(openAppDb());
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual([
      "meta",
      "notes",
      "settings",
      "substitutions",
      "timetables",
    ]);
  });

  it("reopens an existing database without recreating stores", async () => {
    (await openAppDb()).close();
    const again = await track(openAppDb());
    expect([...again.objectStoreNames]).toHaveLength(5);
  });

  it("round-trips through the real schema", async () => {
    const cache = createIdbCache(track(openAppDb()));
    await cache.putSettings({ ...DEFAULT_SETTINGS, selectedClassId: "-927" });
    expect((await cache.getSettings()).selectedClassId).toBe("-927");
  });

  it("backfills a settings field missing from an older record", async () => {
    const db = await openAppDb();
    // Simulate a record written before `lang` existed.
    await db.put("settings", { selectedClassId: "-927" } as never, "app");
    db.close();

    const settings = await createIdbCache(track(openAppDb())).getSettings();
    expect(settings.lang).toBe(DEFAULT_SETTINGS.lang);
    expect(settings.selectedClassId).toBe("-927");
  });

  it("backfills the accent and colour-coding fields for a record written before they existed", async () => {
    const db = await openAppDb();
    // Simulate a record written before `appAccent`/`subjectColorCodingEnabled` existed — an
    // existing user's own settings must come back unchanged otherwise.
    await db.put("settings", { selectedClassId: "-927", theme: "dark" } as never, "app");
    db.close();

    const settings = await createIdbCache(track(openAppDb())).getSettings();
    // Preserving today's look exactly is the point: "default" accent, colour-coding still on.
    expect(settings.appAccent).toBe("default");
    expect(settings.subjectColorCodingEnabled).toBe(true);
    expect(settings.theme).toBe("dark");
  });
});

describe("createCache", () => {
  it("returns a working cache when IndexedDB is available", async () => {
    const cache = await createCache();
    await cache.putSettings({ ...DEFAULT_SETTINGS, theme: "dark" });
    expect((await cache.getSettings()).theme).toBe("dark");
  });

  it("falls back to memory when IndexedDB throws", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("IndexedDB disabled");
    });

    const cache = await createCache();
    await cache.putSettings({ ...DEFAULT_SETTINGS, theme: "light" });
    expect((await cache.getSettings()).theme).toBe("light"); // works, just not persistent
  });
});
