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
import { glanceLesson, type RigaClock } from "../schedule/index.ts";
import { WIDGET_PAYLOAD_VERSION, type WidgetPayload, type WidgetStrings } from "./types.ts";

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

/**
 * Time range, room, class — in that order, dropping whatever is missing. The time range is
 * unconditional: `glanceLesson` only ever returns a lesson `timedLessons` accepted, so a slot
 * with the empty times `resolveDay` emits for an unpublished period cannot reach here.
 */
const subtitleOf = (lesson: ResolvedLesson, className: string): string => {
  const parts: string[] = [`${lesson.start}–${lesson.end}`];
  const room = lesson.rooms.map((r) => (r.short === "" ? r.name : r.short)).find((n) => n !== "");
  if (room !== undefined) parts.push(room);
  if (className !== "") parts.push(className);
  return parts.join(" · ");
};

const empty = (
  state: WidgetPayload["state"],
  title: string,
  input: WidgetPayloadInput,
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
  if (glance === null) return empty("done", strings.done, input);

  const { lesson, live, minutes } = glance;
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
  };
};
