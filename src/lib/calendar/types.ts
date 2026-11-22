/**
 * The calendar-export contract: the shapes every stage of the pipeline agrees on.
 *
 *   ResolvedDay[] ──events.ts──▶ CalendarEvent[] ──ics.ts──▶ .ics text ──router.ts──▶ a target
 *
 * Pure and React-free, and domain-light on purpose: `events.ts` is the only stage that reads
 * EduPage's `ResolvedDay`; the serializer and the router only ever see `CalendarEvent`. Times are
 * wall-clock Europe/Riga (CLAUDE.md: the timezone is always Riga) — never device-local.
 */
import type { ISODate, HHMM } from "@/lib/edupage";

/** What happened to a lesson relative to the base timetable. Drives status, marker and title. */
export type CalendarChange =
  | "none"
  | "cancelled"
  | "moved"
  | "substituted"
  | "room_change"
  | "added";

export type CalendarEvent = {
  /**
   * Stable across exports: the same lesson on the same date always gets the same UID, so a
   * re-import UPDATES the existing calendar entry instead of duplicating it. `@stundio` suffix.
   */
  uid: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  /** Already-localised, ready to show: "Mathematics" or "⚠ Mathematics (cancelled)". */
  title: string;
  /** Room(s), joined; "" when unknown. */
  location: string;
  /** Plain text, \n-separated: teachers, group, the school's own change note (verbatim). */
  description: string;
  change: CalendarChange;
  /**
   * RFC 5545 SEQUENCE: bumped whenever the lesson differs from the base timetable, so calendar
   * apps accept the re-import as a newer version. 0 for an unchanged lesson, 1 for any change.
   */
  sequence: number;
};

/** Strings the events carry that are chrome (translated) rather than school-written text. */
export type CalendarLabels = {
  cancelled: string; // "cancelled"
  moved: string;
  substituted: string;
  roomChange: string;
  added: string;
  teachers: string; // "Teachers"
  group: string; // "Group"
  changeNote: string; // "From school"
};

export type ExportRange = { from: ISODate; to: ISODate }; // inclusive

/** Where an export can go. The router maps each to a delivery strategy. */
export type CalendarTarget =
  | "google" // Google Calendar: per-event "add" links; bulk via .ics import page
  | "apple" // Apple Calendar / iOS: .ics opened by the OS
  | "outlook" // Outlook / Microsoft 365: per-event deeplinks; bulk via .ics
  | "ics"; // any other app: the .ics file as-is

export type CalendarFile = { fileName: string; text: string; mime: "text/calendar" };

/** What the router hands back to the UI so it can say what happened. */
export type ExportOutcome =
  | { kind: "file"; via: "native" | "web-share" | "download"; eventCount: number }
  | { kind: "link-opened"; eventCount: number }
  | { kind: "nothing-to-export" };
