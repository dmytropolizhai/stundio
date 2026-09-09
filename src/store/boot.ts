/**
 * Production wiring: real IndexedDB cache, native transport, resume listener.
 * Split out of `provider.tsx` so that file exports only components (React Fast Refresh),
 * and so tests can substitute a `Boot` without touching the network.
 */
import { createAppStore } from "./useAppStore.ts";
import type { Store } from "./context.ts";
import { createCache } from "../db/index.ts";
import { capacitorHttp } from "../lib/edupage/index.ts";
import { createSyncEngine, watchAppResume } from "../sync/index.ts";

export type Boot = () => Promise<{ store: Store; dispose?: () => void }>;

/** Opens the real cache, hydrates from it, then reaches for the network. */
export const bootApp: Boot = async () => {
  const cache = await createCache();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({ http: capacitorHttp, cache }),
  });

  // Paint from cache first; the network catches up underneath.
  await store.getState().hydrate();
  void store.getState().refresh();

  const dispose = watchAppResume({ refresh: () => store.getState().refresh() });
  return { store, dispose };
};
