/**
 * Production wiring: real IndexedDB cache, native transport, resume listener, connectivity
 * listener.
 * Split out of `provider.tsx` so that file exports only components (React Fast Refresh),
 * and so tests can substitute a `Boot` without touching the network.
 */
import { createAppStore } from "./useAppStore.ts";
import type { Store } from "./context.ts";
import { createCache } from "@/db";
import { defaultHttp, isNativePlatform } from "@/lib/edupage";
import { nativeNetwork } from "@/lib/network";
import { createSyncEngine, watchAppResume, watchConnectivity } from "@/sync";
import {
  checkForAppUpdateNotification,
  notifyOnChanges,
  wireNotifications,
  wireNotificationTaps,
} from "@/notifications";
import { createAnalyticsClient, defaultHttp as analyticsHttp } from "../lib/analytics/index.ts";
import { wireWidget } from "@/widget";

/** The Plausible site the app reports to (a fake domain — there is no web page behind it). */
const ANALYTICS_DOMAIN = "stundio.lv";

export type Boot = () => Promise<{ store: Store; dispose?: () => void }>;

/** Opens the real cache, hydrates from it, then reaches for the network. */
export const bootApp: Boot = async () => {
  const cache = await createCache();
  const isNative = isNativePlatform();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({ http: defaultHttp, cache }),
    analytics: createAnalyticsClient(analyticsHttp, ANALYTICS_DOMAIN),
  });

  // Paint from cache first; the network catches up underneath.
  await store.getState().hydrate();
  store.getState().trackEvent("app_open");
  void store.getState().recordAppOpen();

  const notifications = isNative ? wireNotifications(store) : { dispose: () => {} };
  const notificationTaps = isNative ? wireNotificationTaps(store) : { dispose: () => {} };
  // The home-screen tile follows the store, so a finished sync (or a class change) redraws it
  // immediately — the plugin pokes AppWidgetManager rather than waiting for the 30-min tick.
  const widget = wireWidget(store);
  // A cached timetable list means this device has synced before — gates the "schedule
  // changed" notification off the very first, baseline-less sync.
  const hadPreviousSync = (await cache.getTimetableList()) !== null;

  /*
   * De-duped, not just "the tracked refresh": a resume can fire (or the user can relaunch)
   * while a previous refresh is still in flight — real network round trips, not the instant
   * fakes in tests. An overlapping call would read the same pre-change cache as its own
   * "before" snapshot and independently re-detect the change the first call already caught,
   * firing a second notification for something the user already saw. Sharing one in-flight
   * promise means a second caller gets the first call's outcome instead of racing its own.
   */
  let inFlightRefresh: Promise<void> | null = null;
  const refreshAndNotify = (): Promise<void> => {
    if (inFlightRefresh !== null) return inFlightRefresh;
    const promise = (async () => {
      const outcome = await store.getState().refresh();
      if (isNative) {
        notifyOnChanges(store, outcome, hadPreviousSync);
      }
    })();
    inFlightRefresh = promise;
    void promise.finally(() => {
      inFlightRefresh = null;
    });
    return promise;
  };

  void refreshAndNotify();
  if (isNative) {
    void checkForAppUpdateNotification(store);
  }

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
    widget.dispose();
  };
  return { store, dispose };
};
