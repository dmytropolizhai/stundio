/**
 * RFC 5545 serializer: `CalendarEvent[]` in, `.ics` text out.
 *
 * Pure and dependency-free, and it knows nothing about EduPage — `events.ts` does the mapping and
 * `router.ts` the delivery. Output is deterministic for equal input (the caller's order is kept
 * and `now` is injected), so tests can snapshot it and a re-export diffs cleanly.
 */
import type { CalendarChange, CalendarEvent, ExportRange } from "./types.ts";

const CRLF = "\r\n";
const TZID = "Europe/Riga";
const DEFAULT_PRODID = "-//Stundio//Timetable//EN";
/** RFC 5545 §3.1: content lines are limited to 75 octets, excluding the CRLF. */
const MAX_OCTETS = 75;

/**
 * Riga is EET (+2) and EEST (+3); the EU switches both ways at 01:00 UTC on the last Sunday,
 * i.e. 04:00 EEST -> 03:00 EET in October and 03:00 EET -> 04:00 EEST in March. The 1970 anchors
 * are the dates calendar apps expect for an open-ended RRULE, not historical transitions.
 */
const VTIMEZONE_LINES: readonly string[] = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:STANDARD",
  "DTSTART:19701025T040000",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0200",
  "TZNAME:EET",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700329T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0300",
  "TZNAME:EEST",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

const CATEGORY: Record<CalendarChange, string | null> = {
  none: null,
  cancelled: "Cancelled",
  moved: "Moved",
  substituted: "Substituted",
  room_change: "Room change",
  added: "Added",
};

/** TEXT escaping (§3.3.11). Backslash first, or the ones we add would be doubled. */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/**
 * Fold at 75 octets (not UTF-16 units): iterating by code point means a multi-byte character or
 * surrogate pair is never split, which Google and Outlook would render as mojibake. The leading
 * space of a continuation counts towards its 75, so those carry 74 octets of content.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let used = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (used + size > MAX_OCTETS) {
      parts.push(current);
      current = " ";
      used = 1;
    }
    current += ch;
    used += size;
  }
  parts.push(current);
  return parts.join(CRLF);
}

const compactDate = (date: string): string => date.replace(/-/g, "");
const compactTime = (time: string): string => `${time.replace(":", "")}00`;
const local = (date: string, time: string): string => `${compactDate(date)}T${compactTime(time)}`;

/** `2026-09-01T08:00:00.000Z` -> `20260901T080000Z` */
function utcStamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function eventLines(ev: CalendarEvent, stamp: string): string[] {
  const cancelled = ev.change === "cancelled";
  const category = CATEGORY[ev.change];
  const lines = [
    "BEGIN:VEVENT",
    `UID:${ev.uid.replace(/[\r\n]/g, "")}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZID}:${local(ev.date, ev.start)}`,
    `DTEND;TZID=${TZID}:${local(ev.date, ev.end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
  ];
  if (ev.location !== "") lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.description !== "") lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  lines.push(`SEQUENCE:${ev.sequence}`);
  // Cancelled lessons stay in the file (same UID, higher SEQUENCE) so a re-import marks the
  // earlier copy cancelled instead of leaving it behind; TRANSPARENT frees the slot in free/busy.
  lines.push(`STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`);
  lines.push(`TRANSP:${cancelled ? "TRANSPARENT" : "OPAQUE"}`);
  if (category !== null) lines.push(`CATEGORIES:${category}`);
  lines.push("END:VEVENT");
  return lines;
}

export function serializeCalendar(
  events: CalendarEvent[],
  options: { name: string; now?: Date; prodId?: string },
): string {
  const stamp = utcStamp(options.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options.prodId ?? DEFAULT_PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE_LINES,
    ...events.flatMap((ev) => eventLines(ev, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** ASCII-only because file names travel through share sheets and download attributes. */
export function icsFileName(range: ExportRange, base = "stundio"): string {
  const safe = (s: string): string =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const stem = safe(base) || "stundio";
  const from = safe(range.from);
  const to = safe(range.to);
  return `${stem}-${from}_${to}.ics`;
}
