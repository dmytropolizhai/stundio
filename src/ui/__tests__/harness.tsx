/**
 * A real store — memory cache, real sync engine, fake EduPage replaying the `data/` fixtures
 * (CLAUDE.md: tests never touch the network). The screens under test therefore see the same
 * shapes the device does, not hand-written stubs.
 */
import { act } from "@testing-library/react";
import { createAppStore, type Store } from "../../store/index.ts";
import { createMemoryCache } from "../../db/index.ts";
import { createSyncEngine } from "../../sync/index.ts";
import { createFakeServer } from "../../sync/__tests__/fakeServer.ts";
import type { Settings } from "../../db/index.ts";

/** The date the fixtures were captured on — a Wednesday with 55 substitutions. */
export const FIXTURE_DATE = "2026-09-09";

export type Harness = {
  store: Store;
  server: ReturnType<typeof createFakeServer>;
  cache: ReturnType<typeof createMemoryCache>;
};

export const bootHarness = async (settings: Partial<Settings> = {}): Promise<Harness> => {
  const cache = createMemoryCache();
  const server = createFakeServer();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({
      http: server.http,
      cache,
      now: () => new Date(`${FIXTURE_DATE}T08:00:00Z`),
    }),
  });

  await store.getState().hydrate();
  await store.getState().refresh({ date: FIXTURE_DATE });

  const patch = { ...settings };
  if (patch.selectedClassId === undefined) {
    const timetable = Object.values(store.getState().timetables)[0];
    patch.selectedClassId = timetable?.classes.find((c) => c.short === "A1-2")?.id ?? null;
  }
  await act(async () => {
    await cache.putSettings({ ...(await cache.getSettings()), ...patch });
    await store.getState().hydrate();
  });

  return { store, server, cache };
};

export const classIdOf = (store: Store, short: string): string =>
  Object.values(store.getState().timetables)[0]?.classes.find((c) => c.short === short)?.id ?? "";

/**
 * `act` around a click that triggers a store write. Settings go through the async cache, so
 * the extra microtask is what lets the resulting re-render land before the assertion.
 */
export const clickAndSettle = async (fn: () => void): Promise<void> => {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
};
