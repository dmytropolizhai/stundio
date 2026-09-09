/**
 * The only file under lib/edupage allowed to import Capacitor (enforced by ESLint).
 *
 * EduPage sends no `Access-Control-Allow-Origin`, so the browser `fetch` implementation
 * below CANNOT reach it cross-origin — it exists for tests and for the Vite dev preview.
 * On device, `capacitorHttp` goes through the native layer and is not subject to CORS.
 */
import { CapacitorHttp } from "@capacitor/core";

export type HttpRequest = {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
};

export type HttpResponse = {
  status: number;
  data: unknown;
};

export type HttpClient = (req: HttpRequest) => Promise<HttpResponse>;

/** Identifies the app to the school's server. Be a good citizen (CLAUDE.md: don't poll). */
export const USER_AGENT = "rvt-stunda/0.1 (+https://polizhai.site; personal timetable app)";

const baseHeaders = (extra?: Record<string, string>): Record<string, string> => ({
  "Content-Type": "application/json",
  ...extra,
});

/** Native HTTP — the real transport on Android. */
export const capacitorHttp: HttpClient = async ({ url, body, headers }) => {
  const res = await CapacitorHttp.post({
    url,
    headers: baseHeaders({ "User-Agent": USER_AGENT, ...headers }),
    data: body,
  });
  return { status: res.status, data: res.data };
};

/**
 * `fetch` transport for Vitest and the web dev preview.
 * Cross-origin calls to EduPage will fail here — that is expected, not a bug.
 */
export const fetchHttp: HttpClient = async ({ url, body, headers }) => {
  const res = await fetch(url, {
    method: "POST",
    headers: baseHeaders(headers),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: parseLooseJson(text) };
};

/**
 * EduPage occasionally prefixes the JSON body with junk; the Python probe strips it the
 * same way. Returns the raw string when it is not JSON at all, so callers can report it.
 */
export const parseLooseJson = (text: string): unknown => {
  const start = text.indexOf("{");
  const candidate = start > 0 ? text.slice(start) : text;
  try {
    return JSON.parse(candidate);
  } catch {
    return text;
  }
};
