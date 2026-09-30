/**
 * Ties the store to the home-screen widget, the way `src/notifications/wire.ts` ties it to the
 * OS notification plugin. Nothing here decides which lesson is current — that is
 * `lib/schedule/` via `buildWidgetPayload`; this module only knows *when* to re-publish and
 * where the class label and the translated chrome come from.
 *
 * Publishing is deliberately not tied to sync alone: picking a class or switching language
 * changes what the tile should say without any network involved, so the store subscription is
 * the trigger and a fingerprint keeps it from crossing the bridge on every tick.
 */
import {
  buildWidgetPayload,
  nativeWidget,
  type WidgetPayload,
  type WidgetStrings,
} from "@/lib/widget";
import { rigaClock, type RigaClock } from "@/lib/schedule";
import { isIdentified, matchPersona } from "@/lib/persona";
import { translate, type Lang } from "@/ui/i18n";
import type { AppState, Store } from "@/store";

const stringsFor = (lang: Lang): WidgetStrings => ({
  now: translate(lang, "widget.now"),
  next: translate(lang, "widget.next"),
  done: translate(lang, "widget.done"),
  noClass: translate(lang, "widget.noClass"),
  noData: translate(lang, "widget.noData"),
  minutesLeft: (minutes) => translate(lang, "widget.minutesLeft", { minutes }),
  minutesUntil: (minutes) => translate(lang, "widget.minutesUntil", { minutes }),
});

/**
 * Whose timetable the tile shows: the picked class's short for a student, the teacher's short
 * for a teacher — merged across buildings the way the pickers do it.
 */
const identityLabel = (state: AppState): string | null =>
  matchPersona(state.identity(), {
    student: ({ classId }) => {
      if (classId === null) return null;
      for (const timetable of Object.values(state.timetables)) {
        const match = timetable.classes.find((c) => c.id === classId);
        if (match !== undefined && match.short !== "") return match.short;
      }
      // A class is chosen but its timetable is not cached yet — "no-data", not "no-class".
      return classId;
    },
    teacher: ({ teacherId }) => {
      if (teacherId === null) return null;
      for (const timetable of Object.values(state.timetables)) {
        const match = timetable.teachers.find((t) => t.id === teacherId);
        const label = match?.short || match?.name;
        if (label !== undefined && label !== "") return label;
      }
      return teacherId;
    },
  });

/** What the widget should be showing for this store state, right now. */
export const widgetPayloadFor = (
  state: AppState,
  now: RigaClock = rigaClock(),
  updatedAt: Date = new Date(),
): WidgetPayload =>
  buildWidgetPayload({
    day: isIdentified(state.identity()) ? state.resolvedDay(now.date) : null,
    now,
    className: identityLabel(state),
    strings: stringsFor(state.settings.lang),
    updatedAt,
  });

export type WidgetPublisher = (payload: WidgetPayload) => Promise<void>;

/**
 * Pushes the current payload across the bridge once. Safe to call anywhere: off Android there
 * is no plugin and this resolves without doing anything.
 */
export const publishWidget = async (
  store: Store,
  publish: WidgetPublisher | null = nativeWidget(),
): Promise<void> => {
  if (publish === null) return;
  const state = store.getState();
  if (!state.ready) return;
  await publish(widgetPayloadFor(state));
};

/**
 * Keeps the widget in step with the store for the life of the app. The countdown itself is
 * not re-published on a timer here — that is the background scheduler's job, and its entry
 * point on the native side is `NextLessonWidget.refresh(context)`.
 */
export const wireWidget = (
  store: Store,
  publish: WidgetPublisher | null = nativeWidget(),
): { dispose: () => void } => {
  if (publish === null) return { dispose: () => undefined };

  let last: string | null = null;
  const republish = (): void => {
    const state = store.getState();
    if (!state.ready) return;
    const payload = widgetPayloadFor(state);
    // `updatedAt` changes on every call by design, so it cannot take part in the comparison.
    const fingerprint = JSON.stringify({ ...payload, updatedAt: "" });
    if (fingerprint === last) return;
    last = fingerprint;
    void publish(payload);
  };

  republish();
  return { dispose: store.subscribe(republish) };
};
