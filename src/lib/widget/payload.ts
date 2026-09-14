/**
 * Turns "what's on now / next" into the flat, already-rendered `WidgetPayload` the Android
 * widget draws (PLAN.md parallel track).
 *
 * Every decision that could be called *schedule logic* is delegated to `src/lib/schedule/` —
 * this module only picks strings and glues them together. That is the whole point: the widget
 * and the day screen must never disagree about which lesson is current, so there is exactly
 * one implementation of that question and it is `glanceLesson`.
 *
 * Pure and React-free. The Capacitor hand-off lives in `native.ts`, the store wiring in
 * `src/widget/wire.ts`.
 */
import type { ResolvedDay, ResolvedLesson } from "../edupage/index.ts";
import { dayProgress, glanceLesson, timedLessons, type RigaClock } from "../schedule/index.ts";
import {
  WIDGET_PAYLOAD_VERSION,
  type WidgetDayEntry,
  type WidgetPayload,
  type WidgetStrings,
} from "./types.ts";

export type WidgetPayloadInput = {
  /** Today's resolved day, or null when nothing is cached for it. */
  day: ResolvedDay | null;
  now: RigaClock;
  /** The picked class's short label ("A1-1"), or null when onboarding never finished. */
  className: string | null;
  strings: WidgetStrings;
  /** Injected so the payload is reproducible in tests; defaults to the real clock. */
  updatedAt?: Date;
};

/** aSc colours arrive as `#rrggbb`, but a cached older timetable may carry junk — drop it. */
const HEX = /^#[0-9a-f]{6}$/i;

const accentOf = (lesson: ResolvedLesson): string | null => {
  const color = lesson.subject?.color;
  return typeof color === "string" && HEX.test(color) ? color : null;
};

/** A RemoteViews `TextView` cannot fall back, so the headline is never allowed to be blank. */
const titleOf = (lesson: ResolvedLesson): string => {
  const subject = lesson.subject;
  if (subject === null) return "—";
  const label = subject.short.trim() === "" ? subject.name.trim() : subject.short.trim();
  return label === "" ? "—" : label;
};

/** A room's short code, falling back to its full name — "" when the lesson carries no room. */
const roomOf = (lesson: ResolvedLesson): string =>
  lesson.rooms.map((r) => (r.short === "" ? r.name : r.short)).find((n) => n !== "") ?? "";

/**
 * Time range, room, class — in that order, dropping whatever is missing. The time range is
 * unconditional: `glanceLesson` only ever returns a lesson `timedLessons` accepted, so a slot
 * with the empty times `resolveDay` emits for an unpublished period cannot reach here.
 */
const subtitleOf = (lesson: ResolvedLesson, className: string): string => {
  const parts: string[] = [`${lesson.start}–${lesson.end}`];
  const room = roomOf(lesson);
  if (room !== "") parts.push(room);
  if (className !== "") parts.push(className);
  return parts.join(" · ");
};

/**
 * Every timed lesson today, for the all-day widget's list — regardless of whether the day has
 * started, is in progress, or is over. Empty for a day that is not `now`'s date: the all-day
 * widget must not show another day's schedule under today's label.
 */
const dayEntries = (day: ResolvedDay, now: RigaClock): WidgetDayEntry[] => {
  if (day.date !== now.date) return [];
  return timedLessons(day.lessons).map(({ lesson, start, end }) => ({
    time: `${lesson.start}–${lesson.end}`,
    title: titleOf(lesson),
    subtitle: roomOf(lesson),
    accent: accentOf(lesson),
    state: now.minutes >= end ? "done" : now.minutes >= start ? "live" : "upcoming",
  }));
};

const empty = (
  state: WidgetPayload["state"],
  title: string,
  input: WidgetPayloadInput,
  today: WidgetDayEntry[] = [],
): WidgetPayload => ({
  version: WIDGET_PAYLOAD_VERSION,
  updatedAt: (input.updatedAt ?? new Date()).toISOString(),
  date: input.now.date,
  state,
  label: "",
  title,
  subtitle: state === "done" && input.className !== null ? input.className : "",
  countdown: "",
  accent: null,
  minutesUntilChange: null,
  progressPercent: null,
  today,
});

/**
 * The one function the widget's contents come from. Returns a payload for *every* input,
 * including the empty ones — a widget with nothing to say still has to say something, and a
 * home-screen tile that silently keeps yesterday's lesson is worse than one that admits it.
 */
export const buildWidgetPayload = (input: WidgetPayloadInput): WidgetPayload => {
  const { day, now, className, strings } = input;

  if (className === null) return empty("no-class", strings.noClass, input);
  if (day === null) return empty("no-data", strings.noData, input);

  const glance = glanceLesson(day, now);
  if (glance === null) return empty("done", strings.done, input, dayEntries(day, now));

  const { lesson, live, minutes } = glance;
  const progress = live ? dayProgress(day, now).progress : null;
  return {
    version: WIDGET_PAYLOAD_VERSION,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
    date: day.date,
    state: live ? "live" : "upcoming",
    label: live ? strings.now : strings.next,
    title: titleOf(lesson),
    subtitle: subtitleOf(lesson, className),
    countdown: live ? strings.minutesLeft(minutes) : strings.minutesUntil(minutes),
    accent: accentOf(lesson),
    minutesUntilChange: minutes,
    progressPercent: progress === null ? null : Math.round(progress * 100),
    today: dayEntries(day, now),
  };
};
