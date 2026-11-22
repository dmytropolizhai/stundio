/**
 * Public surface of the calendar-export library: lessons -> events -> .ics -> a target.
 * UI code imports from here only; `native.ts` stays internal (it is the Capacitor seam).
 */
export type * from "./types.ts";
export { buildCalendarEvents, eventsForRange } from "./events.ts";
export { icsFileName, serializeCalendar } from "./ics.ts";
export { GOOGLE_IMPORT_URL, googleEventUrl, outlookEventUrl } from "./providers.ts";
export {
  browserCalendarEnvironment,
  routeCalendarExport,
  type CalendarEnvironment,
  type CalendarExportContext,
  type CalendarShareNavigator,
} from "./router.ts";
