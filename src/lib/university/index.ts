/**
 * The university layer's public surface (RTU + LU). Like `lib/edupage`, it is pure apart
 * from going through an injected `HttpClient`, and knows nothing of `db`, `store` or `ui`.
 */
export * from "./types.ts";
export {
  UNIVERSITY_ORIGINS,
  UNIVERSITY_PROXY_PREFIX,
  UniversityError,
  universityBaseUrl,
} from "./transport.ts";
export {
  UNIVERSITY_SLOTS,
  isCovered,
  listUniversitySubgroups,
  resolveUniversityDay,
  slotsOf,
  type UniversityResolveOptions,
} from "./resolve.ts";
export {
  UNIVERSITY_MAX_AGE_MS,
  UNIVERSITY_RETENTION_DAYS,
  coversRange,
  fetchUniversityEvents,
  fetchUniversityGroups,
  fetchUniversityPrograms,
  mergeSchedule,
  pruneDate,
  universityWindow,
  type UniversityProgramEntry,
} from "./schedule.ts";
export { parseRtuEvents, parseRtuGroups, parseRtuPrograms, parseRtuSemesters } from "./rtu.ts";
export { parseLuCatalog, parseLuEvents, type LuProgram } from "./lu.ts";
