/**
 * Two-way synchronisation between the browser URL (`/class/:slug[/week[/:date]]`,
 * `/teacher/:slug[/week[/:date]]`) and the app store.
 *
 * Follows the same `wire*(store) → { dispose }` pattern as `widget/wire.ts` and
 * `notifications/wire.ts`. All history I/O goes through the injected `HistoryAdapter` (DIP),
 * so every lifecycle flow — cold open with empty cache, hydrated open, week deep links,
 * in-app switching, and browser Back/Forward — is testable without a DOM or network.
 */
import {
  formatRoute,
  parseRoute,
  resolveRouteTarget,
  routeFromSubject,
  type AppRoute,
  type HistoryAdapter,
  type RouteProjectionOptions,
} from "@/lib/router";
import type { Store } from "@/store";

export type RouterSubscription = { dispose: () => void };

const hasTimetables = (store: Store): boolean =>
  Object.keys(store.getState().timetables).length > 0;

const sameSubjectRoute = (a: AppRoute, b: AppRoute): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "root" || b.kind === "root") return true;
  return a.slug === b.slug;
};

const projectionFromRoute = (route: AppRoute): RouteProjectionOptions | undefined => {
  if (route.kind === "root" || route.view !== "week") return undefined;
  return route.date === undefined ? { view: "week" } : { view: "week", date: route.date };
};

/**
 * Syncs `store` and `history` in both directions:
 * - Incoming URL (initial load & `popstate`) selects the matching class or teacher, and opens
 *   the Week tab (at `date`, when present) for `/week` routes.
 * - Store selection changes update the URL (`push` between subjects, `replace` when leaving `/`
 *   or normalising a non-canonical slug).
 */
export const wireRouter = (store: Store, history: HistoryAdapter): RouterSubscription => {
  let pendingRoute: AppRoute | null = null;
  let applyingFromHistory = false;

  const syncUrlFromStore = (
    mode: "push" | "replace",
    preserveSearch = false,
    projection?: RouteProjectionOptions,
  ): void => {
    const nextPath = formatRoute(routeFromSubject(store.getState().subject(), projection));
    const currentPath = history.getPathname();
    if (nextPath === currentPath) return;

    const search = preserveSearch ? history.getSearch() : "";
    const nextUrl = `${nextPath}${search}`;
    if (mode === "push") {
      history.push(nextUrl);
    } else {
      history.replace(nextUrl);
    }
  };

  const applyIncomingRoute = (route: AppRoute, preserveSearch: boolean): void => {
    if (route.kind === "root") {
      pendingRoute = null;
      // On initial load at `/`, reflect any already-selected subject without adding a history entry.
      if (preserveSearch) syncUrlFromStore("replace", true);
      return;
    }

    if (!hasTimetables(store)) {
      // Cold open before the first sync lands: keep the URL intact and resolve once timetables arrive.
      pendingRoute = route;
      return;
    }

    pendingRoute = null;
    const target = resolveRouteTarget(route, Object.values(store.getState().timetables));
    if (target === null) {
      // Unknown slug with loaded timetables: normalise back to the active subject (or `/`).
      syncUrlFromStore("replace", preserveSearch);
      return;
    }

    applyingFromHistory = true;
    try {
      void store.getState().applyRouteTarget(target);
      if (route.view === "week") {
        store
          .getState()
          .setPendingNavigation(
            route.date === undefined ? { tab: "week" } : { tab: "week", date: route.date },
          );
      }
    } finally {
      applyingFromHistory = false;
    }
    // Normalise casing / word order while keeping `/week[/:date]` intact.
    syncUrlFromStore("replace", preserveSearch, projectionFromRoute(route));
  };

  // Initial URL reconciliation right after hydration.
  applyIncomingRoute(parseRoute(history.getPathname()), true);

  const unsubscribeStore = store.subscribe(() => {
    if (applyingFromHistory) return;

    if (pendingRoute !== null) {
      if (!hasTimetables(store)) return;
      const route = pendingRoute;
      pendingRoute = null;
      applyIncomingRoute(route, true);
      return;
    }

    const currentRoute = parseRoute(history.getPathname());
    const nextBaseRoute = routeFromSubject(store.getState().subject());
    // Ignore unrelated store updates (sync/weather/notes) when the active subject didn't change,
    // so an active `/week[/:date]` deep link is never clobbered.
    if (sameSubjectRoute(currentRoute, nextBaseRoute)) return;

    // Switching role in Settings to one with no selection yet leaves `subject()` null while the
    // picker is open; keep the previous URL entry intact so picking the new identity pushes
    // cleanly on top of it instead of clobbering it. A full reset (no selection in either role)
    // still returns to `/`.
    if (nextBaseRoute.kind === "root") {
      const { selectedClassId, selectedTeacherId } = store.getState().settings;
      if (selectedClassId !== null || selectedTeacherId !== null) return;
      syncUrlFromStore("replace", false);
      return;
    }

    // Push when switching between two concrete subjects so browser Back returns to the previous one.
    // Replace when entering from `/` (onboarding / initial sync).
    const mode = currentRoute.kind === "root" ? "replace" : "push";
    syncUrlFromStore(mode, false, projectionFromRoute(currentRoute));
  });

  const unsubscribeHistory = history.subscribe(() => {
    applyIncomingRoute(parseRoute(history.getPathname()), false);
  });

  return {
    dispose: () => {
      unsubscribeStore();
      unsubscribeHistory();
    },
  };
};
