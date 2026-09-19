/**
 * The EduPage layer's public surface. UI and store code imports from here only —
 * never from a sibling module, and never fetches or parses EduPage itself (CLAUDE.md).
 */
export * from "./types.ts";
export {
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  capacitorHttp,
  fetchHttp,
  defaultHttp,
  isNativePlatform,
  USER_AGENT,
} from "./http.ts";
export {
  EDUPAGE_PROXY_PREFIX,
  EdupageError,
  apiBaseUrl,
  schoolBaseUrl,
  fetchDaySubstitutionsHtml,
  fetchRegularTimetable,
  fetchTimetableList,
  type RawTimetableListEntry,
} from "./client.ts";
export {
  normalizeTimetable,
  parseTimetableLabel,
  toTimetableMeta,
  type NormalizeResult,
} from "./normalize.ts";
export {
  MAIN_BUILDING,
  findClassTeacher,
  isMainBuilding,
  listBuildings,
  selectTimetable,
  selectTimetables,
  type TimetableSelection,
} from "./select.ts";
export { otherRatio, parseDaySubstitutions } from "./substitutions.ts";
export {
  classWeekLessons,
  coverDuties,
  listSubgroups,
  listTeachers,
  resolveDay,
  resolveDayAcross,
  resolveTeacherDay,
  resolveTeacherDayAcross,
  weekdayOf,
  type ClassWeekLesson,
  type DaySource,
  type ResolveOptions,
  type TeacherListItem,
} from "./resolve.ts";
export {
  areTeachersEqual,
  buildLatvianStem,
  extractMentionedTeachers,
  extractTargetGroups,
  filterNotesForClass,
  getTeacherTokens,
  isNoteRelevantForClass,
  isTeacherMentionedInNote,
  splitGroupAnnouncements,
  type TeacherIdentifier,
} from "./notes.ts";
export {
  indexTeachersByKey,
  lookupTeacher,
  teacherKey,
} from "./teacher-names.ts";

