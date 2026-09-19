import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, WeekGrid, type WeekGridDay, type WeekGridPeriod } from "@/ds";

/**
 * The persona screen's infographic — a real piece of the app on each half, not a picture of one.
 *
 * Both halves mount the DS `WeekGrid` the Week screen mounts, on the DS `Card` it sits on, at the
 * component's own proportions: the miniature is the app scaled down (`zoom`), so it can never
 * drift from the grid a student meets a minute later. What differs is the shape of the week, and
 * that is the whole message — a student reads one column, their own group, filled back to back;
 * a teacher reads several groups at once, with windows between them. The grid's own vocabulary
 * carries the rest: a double lesson spans its two rows, a cancellation stays in place struck
 * through, and a lesson in the other building wears the hairline outline the Week screen gives it.
 *
 * Group codes, subject codes and period times are the school's own (`data/normalized_1175.json`),
 * shown as the app shows them and translated in no locale (CLAUDE.md).
 *
 * `inert` + `aria-hidden`: the half's own title and description already name the role, so the
 * miniature is neither read out nor reachable — every tap on the panel belongs to the panel.
 */

/** The school's real first five period starts. */
const TIMES = [
  { period: 1, start: "08:30", end: "09:10" },
  { period: 2, start: "09:15", end: "09:55" },
  { period: 3, start: "10:10", end: "10:50" },
  { period: 4, start: "10:55", end: "11:35" },
  { period: 5, start: "12:05", end: "12:45" },
] as const;

type Variant = {
  days: readonly WeekGridDay[];
  periods: readonly WeekGridPeriod[];
  /** The grid's own width before `zoom` shrinks it — one column needs far less than three. */
  width: string;
};

const periods = (
  cells: readonly Partial<Record<string, WeekGridPeriod["cells"][string]>>[],
): WeekGridPeriod[] => TIMES.map((t, i) => ({ ...t, cells: cells[i] ?? {} }));

/**
 * One group, one column, no windows: a double first thing, then two singles and a cancellation
 * that keeps its slot — the day a student actually gets.
 */
const STUDENT: Variant = {
  days: [{ key: "A1-1", weekday: "A1-1", today: true }],
  periods: periods([
    { "A1-1": { short: "MAT", name: "Matemātika I", tone: "sky", span: 2 } },
    {},
    { "A1-1": { short: "PRG", name: "Programmatūras koda rakstīšana", tone: "lime" } },
    { "A1-1": { short: "SPO", name: "Sports", tone: "mint", cancelled: true } },
    { "A1-1": { short: "AUD", name: "Audzināšana", tone: "pink" } },
  ]),
  width: "10.5rem",
};

/**
 * Three groups, four lessons, one free period and one lesson in the other building. Half the
 * blocks of the student's day over the same five hours — a teacher's day is assembled, not
 * continuous.
 */
const TEACHER: Variant = {
  days: [
    { key: "S1", weekday: "S1" },
    { key: "L3", weekday: "L3" },
    { key: "S2", weekday: "S2" },
  ],
  periods: periods([
    { S1: { short: "TEH", name: "Telpu un iekārtu apkope", tone: "amber" } },
    { L3: { short: "MAT", name: "Matemātika I", tone: "lilac" } },
    {},
    { S2: { short: "MTN", name: "Materiālu testēšana", tone: "sky", building: "TIC" } },
    { S1: { short: "TEH", name: "Telpu un iekārtu apkope", tone: "amber", cancelled: true } },
  ]),
  width: "16rem",
};

const VARIANTS = { student: STUDENT, teacher: TEACHER } as const;

export type PersonaTimetableArtProps = {
  persona: keyof typeof VARIANTS;
};

/*
 * The miniature is lit, not themed.
 *
 * This screen is a dark island whatever the app theme is — both halves are painted gradients and
 * the theme is not even chosen yet — so the card inside it re-points the DS surface aliases back
 * to their light values for its own subtree. Under `.dark` an untouched card would be near-black
 * on near-black and its empty periods would stop reading as windows, which is the one thing the
 * teacher's grid has to say. No new values: every one of these is the DS's own light token, the
 * same way `dark.css` re-points the same aliases the other way.
 */
const LIT: CSSProperties = {
  "--surface-card": "var(--white)",
  "--surface-sunken": "var(--ink-100)",
  "--text-body": "var(--ink-700)",
  "--text-strong": "var(--ink-900)",
  "--text-muted": "var(--ink-500)",
  "--brand-strong": "var(--blue-600)",
  "--border-hairline": "var(--ink-200)",
  "--border-strong": "var(--ink-300)",
} as CSSProperties;

export const PersonaTimetableArt = ({ persona }: PersonaTimetableArtProps) => {
  const { days, periods: rows, width } = VARIANTS[persona];
  const reduceMotion = useReducedMotion() ?? false;

  /* The screen's one authored moment: the two weeks arrive, the student's a beat ahead. */
  return (
    <div inert aria-hidden="true" style={LIT}>
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.001 : 0.38,
          delay: reduceMotion ? 0 : persona === "student" ? 0.06 : 0.16,
          ease: [0.2, 0.8, 0.2, 1],
        }}
        className="[zoom:0.62] sm:[zoom:0.78]"
        style={{ width }}
      >
        <Card elevation="raised" className="p-3">
          <WeekGrid days={days} periods={rows} />
        </Card>
      </motion.div>
    </div>
  );
};
