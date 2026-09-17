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
  refreshWebPushSubscription,
  reportSubstitutionChangeToServer,
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
      } else if (hadPreviousSync && outcome.changedDates.length > 0) {
        void reportSubstitutionChangeToServer(outcome.changedDates);
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

  /*
   * Keeps the Web Push registration filed under what the *server* can find it by: the class's
   * display short, which only becomes known once a timetable is cached. Starting from `null`
   * rather than the current value on purpose — the first tick that can name the class re-files
   * this device, which is how an installation registered under the old EduPage id (a key the
   * checker never dispatched to) repairs itself without the user touching anything.
   */
  let disposeWebPushSync = () => {};
  if (!isNative) {
    let lastRegistration: string | null = null;

    const syncWebPush = () => {
      const { settings, selectedClassShort } = store.getState();
      const className = selectedClassShort();
      if (!settings.notifySubstitutionChanges || className === null) {
        lastRegistration = null;
        return;
      }
      const registration = `${className}|${settings.lang}`;
      if (registration === lastRegistration) return;
      lastRegistration = registration;
      // Never prompts: the OS ask belongs to the Settings toggle the user just turned on.
      void refreshWebPushSubscription(className, settings.lang);
    };

    syncWebPush();
    disposeWebPushSync = store.subscribe(syncWebPush);
  }

  let disposeSw = () => {};
  if (!isNative && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const onSwMessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { type?: unknown; date?: unknown } | null | undefined;
      if (data?.type === "NAVIGATE_DAY" && typeof data.date === "string") {
        store.getState().setPendingNavigation({ tab: "day", date: data.date });
      }
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    disposeSw = () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
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
    disposeWebPushSync();
    disposeSw();
    notifications.dispose();
    notificationTaps.dispose();
    widget.dispose();
  };
  return { store, dispose };
};
