/**
 * EduPage server-function calls. See MODEL.md §1.
 *
 * Every endpoint is a POST with body {"__args":[null,<arg>],"__gsh":"00000000"} and returns
 * HTTP 200 even for failures — errors arrive as an `{ e: "..." }` envelope, so the status
 * code alone proves nothing. `callEdupage` is the single place that check lives.
 */
import type { HttpClient } from "./http.ts";
import type { ISODate } from "./types.ts";

/** The anonymous hash. Not a placeholder — see CLAUDE.md. */
export const ANON_GSH = "00000000";

/** The school's real origin. Always used for `Referer`, whatever the request goes through. */
export const schoolBaseUrl = (subdomain: string): string => `https://${subdomain}.edupage.org`;

/** The dev-server proxy prefix; the target and rewrite live in `vite.config.ts`. */
export const EDUPAGE_PROXY_PREFIX = "/api-edupage";

/**
 * Where requests are actually sent.
 *
 * In `npm run dev` the app is a page on localhost, and EduPage sends no CORS headers
 * (CLAUDE.md), so calls go through Vite's `/api-edupage` proxy. In every other mode — the
 * production bundle Capacitor ships, where `CapacitorHttp` is not bound by CORS, and under
 * Vitest, where the fake server answers — they go straight to the school. This is the only
 * place that choice is made; the proxy must never leak into a device build, which has no
 * dev server to proxy through.
 */
export const apiBaseUrl = (subdomain: string): string =>
  import.meta.env.MODE === "development" ? EDUPAGE_PROXY_PREFIX : schoolBaseUrl(subdomain);

export class EdupageError extends Error {
  readonly func: string;
  readonly detail: unknown;

  constructor(func: string, message: string, detail?: unknown) {
    super(`${func}: ${message}`);
    this.name = "EdupageError";
    this.func = func;
    this.detail = detail;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * POSTs one server function and unwraps `r`, throwing `EdupageError` on the `{ e }` envelope.
 * This is the ONLY function in the module that talks to the network.
 */
export const callEdupage = async <T>(
  http: HttpClient,
  url: string,
  func: string,
  arg: unknown,
  referer: string,
): Promise<T> => {
  const res = await http({
    url,
    body: { __args: [null, arg], __gsh: ANON_GSH },
    headers: { Referer: referer },
  });

  if (res.status < 200 || res.status >= 300) {
    throw new EdupageError(func, `HTTP ${String(res.status)}`, res.data);
  }
  if (!isRecord(res.data)) {
    throw new EdupageError(func, "response was not a JSON object", res.data);
  }
  const envelopeError = res.data["e"];
  if (envelopeError) {
    // HTTP 200 + { e } is how EduPage reports bad input and login-required scopes.
    // `e` is normally a string, but never assume it: stringify defensively.
    const detail =
      typeof envelopeError === "string" ? envelopeError : JSON.stringify(envelopeError);
    throw new EdupageError(func, `server error ${detail}`, envelopeError);
  }
  if (!("r" in res.data)) {
    throw new EdupageError(func, "response had no `r` payload", res.data);
  }
  return res.data["r"] as T;
};

/* ------------------------------------------------------------------ *
 * Raw response shapes (what the endpoints actually return)
 * ------------------------------------------------------------------ */

export type RawTimetableListEntry = {
  tt_num: string;
  year: number;
  text: string;
  datefrom: ISODate;
  hidden?: boolean;
};

export type RawTimetableList = {
  regular: {
    default_num?: string;
    timetables: RawTimetableListEntry[];
  };
};

/** `data_rows` shapes vary per table; normalize.ts narrows them. */
export type RawTable = { id: string; data_rows?: Record<string, unknown>[] };
export type RawRegularTimetable = { dbiAccessorRes: { tables: RawTable[] } };

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

/** MODEL.md §1 — list published timetables for a school year (arg is an int). */
export const fetchTimetableList = async (
  http: HttpClient,
  year: number,
  subdomain = "pikcrvt",
): Promise<{ entries: RawTimetableListEntry[]; defaultNum: string | null }> => {
  const base = apiBaseUrl(subdomain);
  const referer = schoolBaseUrl(subdomain);
  const r = await callEdupage<RawTimetableList>(
    http,
    `${base}/timetable/server/ttviewer.js?__func=getTTViewerData`,
    "getTTViewerData",
    year,
    `${referer}/timetable/`,
  );
  return {
    entries: (r.regular?.timetables ?? []).filter((t) => !t.hidden),
    defaultNum: r.regular?.default_num ?? null,
  };
};

/** MODEL.md §1 — the full week for one tt_num. Note: the arg must be a STRING. */
export const fetchRegularTimetable = async (
  http: HttpClient,
  ttNum: string,
  subdomain = "pikcrvt",
): Promise<Record<string, Record<string, unknown>[]>> => {
  const base = apiBaseUrl(subdomain);
  const referer = schoolBaseUrl(subdomain);
  const r = await callEdupage<RawRegularTimetable>(
    http,
    `${base}/timetable/server/regulartt.js?__func=regularttGetData`,
    "regularttGetData",
    String(ttNum),
    `${referer}/timetable/`,
  );
  return Object.fromEntries((r.dbiAccessorRes?.tables ?? []).map((t) => [t.id, t.data_rows ?? []]));
};

/** MODEL.md §1 — substitutions come back as a rendered, localized HTML string. */
export const fetchDaySubstitutionsHtml = async (
  http: HttpClient,
  date: ISODate,
  mode: "classes" | "teachers" | "classrooms" = "classes",
  subdomain = "pikcrvt",
): Promise<string> => {
  const base = apiBaseUrl(subdomain);
  const referer = schoolBaseUrl(subdomain);
  const r = await callEdupage<unknown>(
    http,
    `${base}/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml`,
    "getSubstViewerDayDataHtml",
    { date, mode },
    `${referer}/substitution/`,
  );
  if (typeof r !== "string") {
    throw new EdupageError("getSubstViewerDayDataHtml", "expected an HTML string", r);
  }
  return r;
};
