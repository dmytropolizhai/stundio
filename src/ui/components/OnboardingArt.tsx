import { motion, useReducedMotion } from "framer-motion";
import type { ResolvedLesson } from "@/lib/edupage";
import { SyncStatus } from "@/ds";
import { LessonRow } from "./LessonRow.tsx";
import { useT } from "@/ui/i18n";
import dayScreen from "../../assets/onboarding/day-view.png";
import weekScreen from "../../assets/onboarding/week-view.png";
import subjectsScreen from "../../assets/onboarding/subjects-view.png";
import settingsScreen from "../../assets/onboarding/settings-view.png";

/**
 * The four illustrations of the intro tour — one per promise the tour makes.
 *
 * Each is the real thing rather than a picture of it: slides 2 and 3 mount the same `LessonRow`
 * the Day screen mounts, so a sample lesson can never drift from the card a student meets a
 * minute later, and slide 3's pill is the DS `SyncStatus` the header uses. Only slide 1 is
 * genuinely a picture — four exported screens are the one thing the tour can't render live,
 * since the student has no class selected yet.
 *
 * Every panel is `aria-hidden`: the slide's own title and body already say what the picture
 * shows, and reading a fabricated timetable aloud would be noise, not information.
 *
 * The sample lesson text is Latvian and stays Latvian in every locale — subject, teacher and
 * room strings are school-written data, which this app never translates (CLAUDE.md).
 */

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

const SampleDay = ({ lessons }: { lessons: ResolvedLesson[] }) => (
  <ul className="m-0 flex w-full list-none flex-col gap-2.5 p-0 text-left">
    {lessons.map((l) => (
      <LessonRow key={l.period} lesson={l} live={false} showTime />
    ))}
  </ul>
);

/* ------------------------------------------------------------------ *
 * 1 — the timetable, in one place
 * ------------------------------------------------------------------ */

/**
 * Back-to-front: the two outer screens sit furthest back and smallest, so the Day view — the tab
 * the app opens on — reads as the front of the deck.
 */
const SCREENS = [
  { id: "settings", src: settingsScreen, x: -96, rotate: -15, scale: 0.86 },
  { id: "subjects", src: subjectsScreen, x: 96, rotate: 15, scale: 0.86 },
  { id: "week-left", src: weekScreen, x: -44, rotate: -6.5, scale: 0.93 },
  { id: "week-right", src: weekScreen, x: 44, rotate: 6.5, scale: 0.93 },
  { id: "day", src: dayScreen, x: 0, rotate: 0, scale: 1 },
];

export const AppScreensArt = () => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div aria-hidden="true" className="relative h-48 w-full">
      {SCREENS.map((screen, i) => (
        <div key={screen.id} className="absolute inset-0 flex items-center justify-center">
          <motion.img
            src={screen.src}
            alt=""
            initial={{ opacity: 0, x: 0, rotate: 0, scale: screen.scale, y: 10 }}
            animate={{
              opacity: 1,
              x: screen.x,
              rotate: screen.rotate,
              scale: screen.scale,
              y: 0,
            }}
            transition={{
              duration: reduceMotion ? 0.001 : 0.44,
              delay: reduceMotion ? 0 : i * 0.07,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="h-48 w-auto drop-shadow-[0_10px_22px_rgba(15,23,42,0.22)]"
          />
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 2 — changes are visible at a glance
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

/** A substituted lesson wearing its corner dot, above a cancelled one struck through. */
export const ChangesArt = () => (
  <div aria-hidden="true" className="w-full max-w-80">
    <SampleDay lessons={CHANGED_LESSONS} />
  </div>
);

/* ------------------------------------------------------------------ *
 * 3 — it works offline
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
 * The offline pill over a day that is rendering anyway — the whole point of the cache. The list
 * fades out at the bottom rather than ending, so it reads as "and the rest of the day, too".
 */
export const OfflineArt = () => {
  const t = useT();

  return (
    <div aria-hidden="true" className="flex w-full max-w-80 flex-col items-center gap-3">
      <SyncStatus state="offline" label={t("sync.offline")} />
      <div
        className="w-full"
        style={{
          maskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 58%, transparent 100%)",
        }}
      >
        <SampleDay lessons={OFFLINE_LESSONS} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 4 — notifications about what matters
 * ------------------------------------------------------------------ */

/**
 * A mock of the OS notification the app actually posts, down to its wording: the title is the
 * same `notification.lessonReminder.title` message `notifications/` schedules, so the tour
 * promises the exact string the student will see on their lock screen.
 */
export const NotificationArt = () => {
  const t = useT();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: reduceMotion ? 0 : -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.001 : 0.36, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex w-full max-w-80 gap-3 rounded-xl bg-card p-4 text-left shadow-card"
    >
      <img src="/favicon.png" alt="" className="size-9 shrink-0 rounded-lg" />

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-1.5 font-text text-micro tracking-label text-muted uppercase">
          <span>{t("app.title")}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">10:00</span>
        </div>

        <span className="font-display text-body font-bold tracking-display text-strong">
          {t("notification.lessonReminder.title", {
            subject: "Programmas izstrādes process",
            minutes: 10,
          })}
        </span>

        <span className="font-text text-caption text-muted">244 D(30)P · Montvida Monta</span>
      </div>
    </motion.div>
  );
};
