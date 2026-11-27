export {
  PUBLIC_APP_ORIGIN,
  buildShareUrl,
  formatRoute,
  parseRoute,
  routeFromSubject,
  type RouteProjectionOptions,
} from "./codec.ts";
export { browserHistory, createMemoryHistory, type MemoryHistory } from "./history.ts";
export { resolveRouteTarget } from "./resolve.ts";
export { teacherSlugKey, toSlug, toTeacherSlug } from "./slug.ts";
export type { AppRoute, HistoryAdapter, RouteTarget, RouteView } from "./types.ts";
