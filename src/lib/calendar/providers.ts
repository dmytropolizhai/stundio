/**
 * Pure URL builders for the "add one event" deeplinks of Google Calendar and Outlook.
 *
 * Neither service accepts a bulk import by URL, so these only ever serve a single lesson; the
 * router sends everything else as an `.ics` file. Times are wall-clock Europe/Riga, so Google
 * gets them as floating local times plus `ctz`, and Outlook as naive ISO local times (its
 * deeplink reads them in the user's own zone, which for a Riga school is the right default).
 * `URLSearchParams` does the percent-encoding, which is what keeps Latvian text intact.
 */
import type { CalendarEvent } from "./types.ts";

/** The settings page that carries Google Calendar's "Import" box. */
export const GOOGLE_IMPORT_URL = "https://calendar.google.com/calendar/u/0/r/settings/export";

const GOOGLE_RENDER = "https://calendar.google.com/calendar/render";
const OUTLOOK_COMPOSE = "https://outlook.live.com/calendar/0/deeplink/compose";
const TIME_ZONE = "Europe/Riga";

/** "2026-09-09" + "08:30" -> "20260909T083000" (Google's basic format, no `Z`). */
const googleStamp = (date: string, time: string): string =>
  `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;

export const googleEventUrl = (event: CalendarEvent): string => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    // Google requires start/end joined by a literal slash; it is encoded as %2F, which it accepts.
    dates: `${googleStamp(event.date, event.start)}/${googleStamp(event.date, event.end)}`,
    ctz: TIME_ZONE,
    details: event.description,
    location: event.location,
  });
  return `${GOOGLE_RENDER}?${params.toString()}`;
};

export const outlookEventUrl = (event: CalendarEvent): string => {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: `${event.date}T${event.start}:00`,
    enddt: `${event.date}T${event.end}:00`,
    body: event.description,
    location: event.location,
  });
  return `${OUTLOOK_COMPOSE}?${params.toString()}`;
};
