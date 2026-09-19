import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/ds";

/**
 * The persona screen's infographic — one diagram per role, built on the same period axis so the
 * two halves are read against each other rather than one at a time.
 *
 * The information is the *shape*, not a picture of a person: a student's day is one lane of
 * back-to-back lessons under a single group code, and a teacher's day is the same hours spread
 * across several groups with windows between them. Nothing here is decoration — the lane headers
 * are real group codes from the school's timetable (`data/normalized_1175.json`), the times are
 * the school's real period starts, doubles repeat their subject colour the way a real day does,
 * and the two marked lessons say what the copy beside them promises: a cancellation that stays
 * in place on the student side, a substitution wearing the Day screen's corner dot on the
 * teacher's.
 *
 * `aria-hidden`: the panel's own title and description already name the role, and reading a
 * fabricated timetable aloud would be noise. Group codes and room codes are school-written data,
 * so they stay as they are in every locale (CLAUDE.md).
 */

/** The school's real first five period starts, straight off the fixture. */
const PERIODS = ["08:30", "09:15", "10:10", "10:55", "12:05"] as const;

type Block = {
  /** Index into `PERIODS`. */
  row: number;
  /** Index into the variant's `lanes`. */
  lane: number;
  /** A DS subject-accent utility — the colour *indexes* the subject, it never means anything. */
  tone: string;
  /** The current lesson: the Day screen's 2px ring, and nothing more. */
  now?: boolean;
  /** Cancelled — stays in place, dimmed, struck through. */
  cancelled?: boolean;
  /** Substituted — the same corner dot the lesson row wears. */
  substituted?: boolean;
};

type Variant = {
  lanes: string[];
  blocks: Block[];
};

/*
 * One group, one lane, no gaps: three subjects across five periods, two of them doubles. The
 * fourth period is cancelled and keeps its slot; the third is the one running now.
 */
const STUDENT: Variant = {
  lanes: ["A1-1"],
  blocks: [
    { row: 0, lane: 0, tone: "bg-sky" },
    { row: 1, lane: 0, tone: "bg-sky" },
    { row: 2, lane: 0, tone: "bg-lime", now: true },
    { row: 3, lane: 0, tone: "bg-mint", cancelled: true },
    { row: 4, lane: 0, tone: "bg-pink" },
  ],
};

/*
 * Three groups, four lessons, one window. The same five hours as the student's day and half the
 * blocks — which is the point: a teacher's day is assembled, not continuous.
 */
const TEACHER: Variant = {
  lanes: ["S1", "L3", "S2"],
  blocks: [
    { row: 0, lane: 0, tone: "bg-amber" },
    { row: 1, lane: 1, tone: "bg-lilac", now: true },
    { row: 3, lane: 2, tone: "bg-sky" },
    { row: 4, lane: 0, tone: "bg-amber", substituted: true },
  ],
};

const VARIANTS = { student: STUDENT, teacher: TEACHER } as const;

type PersonaTimetableArtProps = {
  persona: keyof typeof VARIANTS;
};

export const PersonaTimetableArt = ({ persona }: PersonaTimetableArtProps) => {
  const reduceMotion = useReducedMotion() ?? false;
  const { lanes, blocks } = VARIANTS[persona];

  const ease = [0.2, 0.8, 0.2, 1] as const;
  const dur = reduceMotion ? 0.001 : 0.38;
  const delay = (row: number) => (reduceMotion ? 0 : 0.08 + row * 0.07);

  return (
    <div aria-hidden="true" className="w-full max-w-45 sm:max-w-56">
      {/* Lane headers — one group code per column. */}
      <div
        className="grid gap-1.5 pb-1.5"
        style={{ gridTemplateColumns: `2.5rem repeat(${lanes.length}, minmax(0, 1fr))` }}
      >
        <span />
        {lanes.map((lane) => (
          <motion.span
            key={lane}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur, ease }}
            className="truncate text-center font-text text-micro tracking-label text-white/60 uppercase"
          >
            {lane}
          </motion.span>
        ))}
      </div>

      {/* The period axis: one hairline row per lesson hour, start time on the rail. */}
      <div className="flex flex-col gap-1.5">
        {PERIODS.map((start, row) => (
          <div
            key={start}
            className="grid items-stretch gap-1.5 border-t border-white/12 pt-1.5"
            style={{ gridTemplateColumns: `2.5rem repeat(${lanes.length}, minmax(0, 1fr))` }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur, delay: delay(row), ease }}
              className="self-center font-data text-micro leading-none text-white/50 tabular-nums"
            >
              {start}
            </motion.span>

            {lanes.map((lane, laneIndex) => {
              const block = blocks.find((b) => b.row === row && b.lane === laneIndex);

              if (block === undefined) return <span key={lane} className="h-5.5 sm:h-6.5" />;

              return (
                <motion.span
                  key={lane}
                  initial={{ opacity: 0, scaleY: reduceMotion ? 1 : 0.6, y: reduceMotion ? 0 : 4 }}
                  animate={{ opacity: block.cancelled === true ? 0.55 : 1, scaleY: 1, y: 0 }}
                  transition={{ duration: dur, delay: delay(row), ease }}
                  className={cn(
                    "relative block h-5.5 origin-top rounded-xs sm:h-6.5",
                    block.tone,
                    block.now === true && "ring-2 ring-white ring-inset",
                  )}
                >
                  {/* Cancelled keeps its slot and wears the strikethrough the day view gives it. */}
                  {block.cancelled === true && (
                    <span className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-pill bg-mint-ink" />
                  )}

                  {/* Substituted — the Day screen's corner dot, at this scale. */}
                  {block.substituted === true && (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-pill bg-white ring-2 ring-[var(--ink-900)] ring-inset" />
                  )}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
