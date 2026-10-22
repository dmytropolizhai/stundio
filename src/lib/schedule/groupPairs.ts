/*
 * Lessons that two subgroups hold at the same time. With no subgroup picked the resolver returns
 * both divisions of a class ("1" and "2" of a pusgrupa split) in the same period; listing them
 * one under the other reads as two lessons in sequence. Pairing them lets the UI draw the first
 * group on the left and the second on the right. Pure and display-free — the screens decide how
 * a pair looks.
 */
import type { ResolvedLesson } from "@/lib/edupage";

export type LessonSlot = ResolvedLesson | readonly [ResolvedLesson, ResolvedLesson];

const sameSlot = (a: ResolvedLesson, b: ResolvedLesson): boolean =>
  a.period === b.period &&
  a.span === b.span &&
  a.group !== null &&
  b.group !== null &&
  a.group !== b.group;

/**
 * Folds a day's lessons into display slots: a lesson alone, or a left/right pair of two groups'
 * lessons in the same period (ordered by group label). A period with three or more concurrent
 * lessons is left as it came — there is no sensible half-and-half for it.
 */
export const pairByGroup = (lessons: readonly ResolvedLesson[]): LessonSlot[] => {
  const byPeriod = new Map<string, ResolvedLesson[]>();
  for (const lesson of lessons) {
    byPeriod.set(lesson.period, [...(byPeriod.get(lesson.period) ?? []), lesson]);
  }

  const slots: LessonSlot[] = [];
  const done = new Set<string>();
  for (const lesson of lessons) {
    if (done.has(lesson.period)) continue;
    done.add(lesson.period);

    const same = byPeriod.get(lesson.period) ?? [];
    const [a, b] = same;
    if (same.length === 2 && a !== undefined && b !== undefined && sameSlot(a, b)) {
      const [left, right] = (a.group ?? "") <= (b.group ?? "") ? [a, b] : [b, a];
      slots.push([left, right]);
    } else {
      slots.push(...same);
    }
  }
  return slots;
};
