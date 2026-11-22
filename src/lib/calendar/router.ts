/**
 * Stage 3: picks a delivery strategy per target and runs it.
 *
 * Each `CalendarTarget` maps to exactly one strategy in `STRATEGIES` (a table, so adding a
 * target is one row). Everything the platform provides is injected like `lib/share/share.ts`,
 * so the routing can be tested without a device, a browser or a network.
 *
 * Neither Google nor Outlook can bulk-import from a URL, so both get the `.ics` file and only
 * a lone event is worth a deeplink. A dismissed share sheet is a normal outcome, not an error.
 */
import { icsFileName, serializeCalendar } from "./ics.ts";
import { nativeCalendarShare, type NativeCalendarPayload } from "./native.ts";
import { GOOGLE_IMPORT_URL, googleEventUrl, outlookEventUrl } from "./providers.ts";
import type {
  CalendarEvent,
  CalendarFile,
  CalendarTarget,
  ExportOutcome,
  ExportRange,
} from "./types.ts";

/** The slice of `navigator` the Web Share path needs; absent in a WebView and on desktop. */
export type CalendarShareNavigator = {
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
};

export type CalendarEnvironment = {
  native: ((payload: NativeCalendarPayload) => Promise<void>) | null;
  navigator: CalendarShareNavigator | null;
  download: ((blob: Blob, fileName: string) => void) | null;
  openUrl: (url: string) => void;
};

export type CalendarExportContext = {
  /** The calendar's display name (X-WR-CALNAME) and the share sheet's title. */
  name: string;
  range: ExportRange;
  now?: Date;
  /** Export only lessons that differ from the base timetable. */
  changesOnly?: boolean;
};

const MIME = "text/calendar";

const saveToDisk = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const browserCalendarEnvironment = (): CalendarEnvironment => ({
  native: nativeCalendarShare(),
  navigator: typeof navigator === "undefined" ? null : navigator,
  download: typeof document === "undefined" ? null : saveToDisk,
  openUrl: (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  },
});

type Job = {
  events: CalendarEvent[];
  file: CalendarFile;
  title: string;
  env: CalendarEnvironment;
};

type FileVia = Extract<ExportOutcome, { kind: "file" }>["via"];

const isCancel = (error: unknown): boolean => error instanceof Error && error.name === "AbortError";

/** Native sheet > Web Share with a file > download. Returns how it went, or null on cancel. */
const deliverFile = async (job: Job): Promise<FileVia | null> => {
  const { file, title, env } = job;
  try {
    if (env.native !== null) {
      await env.native({ text: file.text, fileName: file.fileName, title });
      return "native";
    }
    const blob = new Blob([file.text], { type: `${MIME};charset=utf-8` });
    const nav = env.navigator;
    if (nav?.share !== undefined) {
      const shared = new File([blob], file.fileName, { type: MIME });
      // `canShare` is what says whether *files* are supported; `share` alone is text-only on
      // several browsers and throws when handed a file there.
      if (nav.canShare?.({ files: [shared] }) === true) {
        await nav.share({ title, files: [shared] });
        return "web-share";
      }
    }
    if (env.download !== null) {
      env.download(blob, file.fileName);
      return "download";
    }
  } catch (error) {
    if (isCancel(error)) return null;
    throw error;
  }
  throw new Error("Calendar export is not supported here");
};

const sendFile = async (job: Job, afterwards?: string): Promise<ExportOutcome> => {
  const via = await deliverFile(job);
  if (via === null) return { kind: "cancelled" };
  // Opened only after the file went out, so a dismissed sheet doesn't also yank the user away.
  if (afterwards !== undefined) job.env.openUrl(afterwards);
  return { kind: "file", via, eventCount: job.events.length };
};

const openSingle = (job: Job, build: (event: CalendarEvent) => string): ExportOutcome | null => {
  const [only] = job.events;
  if (only === undefined || job.events.length !== 1) return null;
  job.env.openUrl(build(only));
  return { kind: "link-opened", eventCount: 1 };
};

type Strategy = (job: Job) => Promise<ExportOutcome>;

/** One strategy per target. */
const STRATEGIES: Record<CalendarTarget, Strategy> = {
  ics: (job) => sendFile(job),
  apple: (job) => sendFile(job),
  google: async (job) => openSingle(job, googleEventUrl) ?? sendFile(job, GOOGLE_IMPORT_URL),
  outlook: async (job) => openSingle(job, outlookEventUrl) ?? sendFile(job),
};

export const routeCalendarExport = async (
  target: CalendarTarget,
  events: CalendarEvent[],
  context: CalendarExportContext,
  env: CalendarEnvironment = browserCalendarEnvironment(),
): Promise<ExportOutcome> => {
  const chosen = context.changesOnly === true ? events.filter((e) => e.change !== "none") : events;
  if (chosen.length === 0) return { kind: "nothing-to-export" };

  const text = serializeCalendar(
    chosen,
    context.now === undefined ? { name: context.name } : { name: context.name, now: context.now },
  );
  const file: CalendarFile = { fileName: icsFileName(context.range), text, mime: MIME };
  return STRATEGIES[target]({ events: chosen, file, title: context.name, env });
};
