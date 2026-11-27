/**
 * The four live Night / Day specimens of the welcome tour — one per promise the tour makes.
 *
 * Every slide renders real app components (`DayGlassLesson`, `SyncStatus`, and the liquid-glass
 * `.u-schedule-glass` grammar) rather than static screenshots or legacy flat cards, so what a
 * student sees during onboarding is identical to the Home screen they land on a minute later.
 *
 * Every panel is `aria-hidden="true"` and mounts zero interactive controls: the slide's own title
 * and body carry the message, and reading a fabricated timetable aloud would be noise.
 *
 * Sample lesson strings stay in Latvian across all locales — subject, teacher, and room text are
 * school-written data, which Stundio never translates (`AGENT.md`).
 */
import { m, useReducedMotion } from "framer-motion";
import type { ResolvedLesson } from "@/lib/edupage";
import { Icon, SyncStatus } from "@/ds";
import { DayGlassLesson } from "@/ui/screens/home-view";
import { useT } from "@/ui/i18n";

const lesson = (l: Omit<ResolvedLesson, "span" | "group" | "changeNote">): ResolvedLesson => ({
  span: 1,
  group: null,
  changeNote: null,
  ...l,
});

const subject = (name: string): ResolvedLesson["subject"] => ({ id: name, name, short: name });
const teacher = (short: string): ResolvedLesson["teachers"][number] => ({
  id: short,
  name: short,
  short,
});
const room = (short: string): ResolvedLesson["rooms"][number] => ({
  id: short,
  name: short,
  short,
});

const GlassSlab = ({ lessons, liveIndex }: { lessons: ResolvedLesson[]; liveIndex?: number }) => {
  const normalLessons = lessons.filter((_, i) => i !== liveIndex);
  const liveLesson = liveIndex !== undefined ? lessons[liveIndex] : undefined;

  return (
    <div className="flex w-full flex-col gap-2.5 text-left">
      {liveLesson !== undefined && (
        <ul className="m-0 list-none p-0">
          <DayGlassLesson
            lesson={liveLesson}
            live
            progress={0.62}
            showTime
            subjectColorOverrides={{}}
            colorCodingEnabled
            filled={false}
          />
        </ul>
      )}
      {normalLessons.length > 0 && (
        <ul className="u-schedule-glass m-0 flex w-full list-none flex-col divide-y divide-(--schedule-divider) overflow-hidden rounded-xl p-0">
          {normalLessons.map((l, idx) => (
            <DayGlassLesson
              key={l.period}
              lesson={l}
              live={false}
              showTime
              subjectColorOverrides={{}}
              colorCodingEnabled
              filled={false}
              connectTop={idx > 0}
              connectBottom={idx < normalLessons.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 1 — the timetable, in one place (live Night / Day Home specimen)
 * ------------------------------------------------------------------ */

const HOME_PREVIEW_LESSONS = [
  lesson({
    period: "5",
    start: "10:10",
    end: "10:50",
    subject: subject("Programmatūras koda rakstīšana"),
    teachers: [teacher("Malickis Vadims")],
    rooms: [room("131a")],
    status: "normal",
  }),
  lesson({
    period: "6",
    start: "10:55",
    end: "11:35",
    subject: subject("Matemātika I"),
    teachers: [teacher("Drozda Lolita")],
    rooms: [room("511")],
    status: "normal",
  }),
];

/**
 * Miniature Home brief strip (lamp countdown chip + day-span capsule) floating above a live
 * deep-tone lesson and the next liquid-glass row.
 */
export const AppScreensArt = () => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <m.div
      aria-hidden="true"
      data-testid="home-preview-art"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.001 : 0.34, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex w-full max-w-[340px] flex-col gap-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="u-schedule-glass-live flex items-center gap-2 rounded-pill px-3.5 py-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-lamp shadow-[0_0_8px_var(--lamp-glow)]"
          />
          <span className="u-data text-[12px] font-bold text-lamp-text">18 min</span>
        </div>

        <div className="u-schedule-glass-chip flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-muted">
          <Icon name="clock" size={13} className="shrink-0 opacity-75" />
          <span className="u-data text-[12px] font-medium text-fg">08:30 – 14:35</span>
        </div>
      </div>

      <GlassSlab lessons={HOME_PREVIEW_LESSONS} liveIndex={0} />
    </m.div>
  );
};

/* ------------------------------------------------------------------ *
 * 2 — changes show up right away
 * ------------------------------------------------------------------ */

const CHANGED_LESSONS = [
  lesson({
    period: "7",
    start: "11:40",
    end: "12:20",
    subject: subject("Audzināšana"),
    teachers: [teacher("Būmanis Agris")],
    rooms: [room("418")],
    status: "substituted",
  }),
  lesson({
    period: "8",
    start: "12:25",
    end: "13:05",
    subject: subject("Matemātika I"),
    teachers: [teacher("Drozda Lolita")],
    rooms: [room("511 (30)P")],
    status: "cancelled",
  }),
];

/** A substituted lesson wearing its status dot, above a cancelled one struck through in place. */
export const ChangesArt = () => (
  <div aria-hidden="true" className="w-full max-w-[340px]">
    <GlassSlab lessons={CHANGED_LESSONS} />
  </div>
);

/* ------------------------------------------------------------------ *
 * 3 — works offline too
 * ------------------------------------------------------------------ */

const OFFLINE_LESSONS = [
  lesson({
    period: "5",
    start: "10:10",
    end: "10:50",
    subject: subject("Programmatūras koda rakstīšana"),
    teachers: [teacher("Malickis Vadims")],
    rooms: [room("131a D(24)TV")],
    status: "normal",
  }),
  lesson({
    period: "6",
    start: "10:55",
    end: "11:35",
    subject: subject("Matemātika I"),
    teachers: [teacher("Drozda Lolita")],
    rooms: [room("511 (30)P")],
    status: "normal",
  }),
];

/**
 * The offline pill over a liquid-glass schedule slab rendering anyway — the whole point of the
 * cache. The bottom fades out rather than stopping abruptly, reading as "the rest of your day".
 */
export const OfflineArt = () => {
  const t = useT();

  return (
    <div aria-hidden="true" className="flex w-full max-w-[340px] flex-col items-center gap-3">
      <SyncStatus state="offline" label={t("sync.offline")} />
      <div
        className="w-full"
        style={{
          maskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
        }}
      >
        <GlassSlab lessons={OFFLINE_LESSONS} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 4 — notifications about what matters
 * ------------------------------------------------------------------ */

/**
 * A lock-screen notification card wearing Stundio's liquid-glass surface and the exact
 * `notification.lessonReminder.title` message `notifications/` schedules.
 */
export const NotificationArt = () => {
  const t = useT();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div aria-hidden="true" className="w-full max-w-[340px]">
      <m.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.001 : 0.34, ease: [0.2, 0.8, 0.2, 1] }}
        className="u-schedule-glass flex w-full gap-3.5 rounded-xl p-4 text-left"
      >
        <img src="/favicon.png" alt="" className="size-10 shrink-0 rounded-sm shadow-card" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-text text-micro tracking-label text-muted uppercase">
              {t("app.title")}
            </span>
            <span className="u-data text-[12px] text-muted">10:00</span>
          </div>

          <span className="font-display text-body leading-snug font-bold tracking-display text-strong">
            {t("notification.lessonReminder.title", {
              subject: "Programmas izstrādes process",
              minutes: 10,
            })}
          </span>

          <span className="font-text text-caption text-muted">244 D(30)P · Montvida Monta</span>
        </div>
      </m.div>
    </div>
  );
};
