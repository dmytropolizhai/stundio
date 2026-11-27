/**
 * Core types for Stundio's URL router: route variants, resolved entity targets, and the
 * history transport port.
 *
 * Pure and dependency-free so every other file in `lib/router/` (and tests) depends only on
 * these contracts.
 */

export type AppRoute =
  { kind: "root" } | { kind: "class"; slug: string } | { kind: "teacher"; slug: string };

/** What a route resolves to in EduPage's entity space. */
export type RouteTarget =
  { persona: "student"; classId: string } | { persona: "teacher"; teacherId: string };

/**
 * Minimal history transport port (DIP).
 * Production binds `browserHistory`; tests substitute `createMemoryHistory`.
 */
export type HistoryAdapter = {
  getPathname: () => string;
  getSearch: () => string;
  push: (url: string) => void;
  replace: (url: string) => void;
  /** Fires on external navigation (browser Back/Forward). Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
};
