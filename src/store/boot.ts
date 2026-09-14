/**
 * Production wiring: real IndexedDB cache, native transport, resume listener, connectivity
 * listener.
 * Split out of `provider.tsx` so that file exports only components (React Fast Refresh),
 * and so tests can substitute a `Boot` without touching the network.
 */
import { createAppStore } from "./useAppStore.ts";
import type { Store } from "./context.ts";
import { createCache } from "../db/index.ts";
import { capacitorHttp } from "../lib/edupage/index.ts";
import { nativeNetwork } from "../lib/network/index.ts";
import { createSyncEngine, watchAppResume, watchConnectivity } from "../sync/index.ts";
import {
  checkForAppUpdateNotification,
  notifyOnChanges,
  wireNotifications,
  wireNotificationTaps,
} from "../notifications/index.ts";
import { createAnalyticsClient, capacitorHttp as analyticsHttp } from "../lib/analytics/index.ts";

/** The Plausible site the app reports to (a fake domain — there is no web page behind it). */
const ANALYTICS_DOMAIN = "stundio.lv";

export type Boot = () => Promise<{ store: Store; dispose?: () => void }>;

/** Opens the real cache, hydrates from it, then reaches for the network. */
export const bootApp: Boot = async () => {
  const cache = await createCache();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({ http: capacitorHttp, cache }),
    analytics: createAnalyticsClient(analyticsHttp, ANALYTICS_DOMAIN),
  });

  // Paint from cache first; the network catches up underneath.
  await store.getState().hydrate();
  store.getState().trackEvent("app_open");
  void store.getState().refresh();

  const notifications = wireNotifications(store);
  const notificationTaps = wireNotificationTaps(store);
  // A cached timetable list means this device has synced before — gates the "schedule
  // changed" notification off the very first, baseline-less sync.
  const hadPreviousSync = (await cache.getTimetableList()) !== null;

  const refreshAndNotify = async (): Promise<void> => {
    const outcome = await store.getState().refresh();
    notifyOnChanges(store, outcome, hadPreviousSync);
  };

  void refreshAndNotify();
  void checkForAppUpdateNotification(store);

  const disposeResume = watchAppResume({ refresh: refreshAndNotify });
  const disposeConnectivity = watchConnectivity({
    network: nativeNetwork,
    onChange: (online) => {
      store.getState().setConnectivity(online);
    },
  });
  const dispose = () => {
    disposeResume();
    disposeConnectivity();
    notifications.dispose();
    notificationTaps.dispose();
  };
  return { store, dispose };
};
