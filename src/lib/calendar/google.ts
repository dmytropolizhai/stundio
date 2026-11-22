/**
 * Stage 3b: the one-tap Google path — put the lessons straight into a "Stundio" calendar in
 * the student's Google account through the Calendar API, no file and no import page.
 *
 * Two choices keep it small and safe:
 *  - The scope is `calendar.app.created`: the app may create calendars of its own and manage
 *    events inside them, and nothing else. It never sees the student's other calendars, and
 *    deleting the "Stundio" calendar undoes everything.
 *  - Events go through `events.import` keyed by their `iCalUID` (the stable UID from `events.ts`),
 *    which creates or updates, so exporting again refreshes lessons instead of duplicating them
 *    and a cancelled lesson arrives as `status: "cancelled"`.
 *
 * The token comes from `googleAuth.ts` and is held in memory only; `fetch` is injected so this
 * runs under test without a network. No server of ours is involved: the browser talks to Google.
 */
import type { CalendarEvent } from "./types.ts";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";

const API = "https://www.googleapis.com/calendar/v3";
const TIME_ZONE = "Europe/Riga";
/** Enough in flight to finish a school week quickly, few enough to stay inside Google's quota. */
const CONCURRENCY = 5;

export type GoogleDeps = {
  token: string;
  fetch: typeof fetch;
};

export type GoogleExportResult = {
  calendarId: string;
  imported: number;
  failed: number;
};

/** Thrown for a rejected token or a missing permission, so the UI can say "sign in again". */
export class GoogleAuthError extends Error {
  override name = "GoogleAuthError";
}

/** Wall-clock Riga times: Google applies the zone itself, so no offset maths on our side. */
const local = (date: string, time: string): { dateTime: string; timeZone: string } => ({
  dateTime: `${date}T${time}:00`,
  timeZone: TIME_ZONE,
});

export const toGoogleEvent = (event: CalendarEvent): Record<string, unknown> => ({
  iCalUID: event.uid,
  summary: event.title,
  start: local(event.date, event.start),
  end: local(event.date, event.end),
  status: event.change === "cancelled" ? "cancelled" : "confirmed",
  sequence: event.sequence,
  ...(event.location === "" ? {} : { location: event.location }),
  ...(event.description === "" ? {} : { description: event.description }),
});

const call = async (
  deps: GoogleDeps,
  path: string,
  init: { method: string; body?: unknown },
): Promise<Response> => {
  const response = await deps.fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${deps.token}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (response.status === 401 || response.status === 403) {
    throw new GoogleAuthError(`Google refused the request (${response.status})`);
  }
  return response;
};

/**
 * The calendar to write into: the remembered one if it still exists (the student may have
 * deleted it), otherwise a fresh "Stundio" calendar in Riga time.
 */
export const ensureCalendar = async (
  deps: GoogleDeps,
  name: string,
  existingId: string,
): Promise<string> => {
  if (existingId !== "") {
    const found = await call(deps, `/calendars/${encodeURIComponent(existingId)}`, {
      method: "GET",
    });
    if (found.ok) return existingId;
  }
  const created = await call(deps, "/calendars", {
    method: "POST",
    body: { summary: name, timeZone: TIME_ZONE },
  });
  if (!created.ok) throw new Error(`Could not create the calendar (${created.status})`);
  const body = (await created.json()) as { id?: string };
  if (typeof body.id !== "string") throw new Error("Google returned no calendar id");
  return body.id;
};

/** Runs `worker` over `items` with at most `limit` in flight; results keep input order. */
const pool = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const lane = async (): Promise<void> => {
    for (let index = next++; index < items.length; index = next++) {
      results[index] = await worker(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
};

export const exportToGoogleCalendar = async (
  deps: GoogleDeps,
  events: CalendarEvent[],
  options: { name: string; calendarId: string },
): Promise<GoogleExportResult> => {
  const calendarId = await ensureCalendar(deps, options.name, options.calendarId);
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/import`;
  const outcomes = await pool(events, CONCURRENCY, async (event) => {
    const response = await call(deps, path, { method: "POST", body: toGoogleEvent(event) });
    return response.ok;
  });
  const imported = outcomes.filter(Boolean).length;
  return { calendarId, imported, failed: outcomes.length - imported };
};
