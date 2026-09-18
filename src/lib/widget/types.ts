/**
 * The contract between JS and the Android home-screen widget (PLAN.md parallel track).
 *
 * The widget is a `RemoteViews` tree: it can set text on a `TextView` and a tint on a `View`,
 * and nothing else. So this payload is deliberately *already rendered* — every string here is
 * final, translated, and goes straight into a text view. Anything the native side had to
 * decide for itself would be schedule logic living in two places, which is exactly what
 * `src/lib/schedule/` exists to prevent.
 */
import type { ISODate, ISODateTime } from "@/lib/edupage";

/**
 * What the widget is currently saying. The native side keys nothing off this — it exists so
 * the payload is legible in a bug report, and so the background-refresh scheduler can tell a
 * "nothing more today" widget (cheap to leave alone) from a live countdown.
 */
export type WidgetState =
  | "live" // a lesson is in progress
  | "upcoming" // the next lesson has not started yet
  | "done" // the school day is over, or the day is empty
  | "no-class" // nobody has picked a class yet
  | "no-data"; // a class is picked but nothing is cached for that day

/** The widget's schema version. Bump when a field's meaning changes, never for additions. */
export const WIDGET_PAYLOAD_VERSION = 1;

/** Where a `WidgetDayEntry` sits relative to "now" — the all-day widget's only visual cue. */
export type WidgetDayEntryState = "done" | "live" | "upcoming";

/** One row of the all-day widget's list, already rendered, in schedule order. */
export type WidgetDayEntry = {
  /** "08:30–09:10", already assembled. */
  time: string;
  /** The subject, or an em dash — same rule as `WidgetPayload.title`. */
  title: string;
  /** Room short code, or "" when the lesson has none. */
  subtitle: string;
  /** `#RRGGBB` for the row's accent rail, from the subject's own colour. Null → widget default. */
  accent: string | null;
  state: WidgetDayEntryState;
};

export type WidgetPayload = {
  version: typeof WIDGET_PAYLOAD_VERSION;
  /** When JS last wrote this. The widget shows nothing from the network — only this. */
  updatedAt: ISODateTime;
  /** The Riga date the payload describes. */
  date: ISODate;
  state: WidgetState;
  /** Eyebrow line: "Now" / "Next", empty in the empty states. */
  label: string;
  /** Headline: the subject, or the empty-state sentence. Never empty. */
  title: string;
  /** "08:30–09:10 · 210 · A1-1", already assembled. Empty when there is nothing to say. */
  subtitle: string;
  /** "12 min left" / "in 35 min". Empty when no countdown applies. */
  countdown: string;
  /** `#RRGGBB` for the accent rail, from the subject's own colour. Null → widget default. */
  accent: string | null;
  /**
   * Whole minutes until this payload stops being true — the current lesson ends, or the next
   * one starts. Null when nothing is scheduled to change today. The seam a background
   * scheduler reads to decide when to ask for a re-render.
   */
  minutesUntilChange: number | null;
  /** 0–100 through the live lesson, for the countdown widget's progress bar. Null outside "live". */
  progressPercent: number | null;
  /** Every timed lesson today, in schedule order. Empty in every empty state. */
  today: WidgetDayEntry[];
};

/** Chrome, already translated by the caller — `src/lib/` never reaches into `src/ui/i18n`. */
export type WidgetStrings = {
  /** Eyebrow over a lesson in progress. */
  now: string;
  /** Eyebrow over the next lesson. */
  next: string;
  /** "No more lessons today". */
  done: string;
  /** "Pick a class". */
  noClass: string;
  /** "Open Stundio to sync". */
  noData: string;
  /** "{minutes} min left" — `{minutes}` is interpolated by the caller's translator. */
  minutesLeft: (minutes: number) => string;
  /** "in {minutes} min". */
  minutesUntil: (minutes: number) => string;
};
