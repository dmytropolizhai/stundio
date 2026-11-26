/**
 * Pure proportional-time geometry for the 2D Week Calendar canvas.
 *
 * Maps a school week's resolved days and bell periods onto a continuous minute axis so every
 * lesson block reflects its true wall-clock duration, double periods and free windows are
 * immediately legible by height, and paired subgroups sit side-by-side without overlapping.
 *
 * React-free on purpose so every edge case (merged runs, subgroup pairs, breaks, missing times)
 * is directly unit-testable.
 */
import type {
  HHMM,
  ISODate,
  ResolvedDay,
  ResolvedLesson,
  TeacherResolvedLesson,
} from "@/lib/edupage";
import { longBreaks, minutesOf, pairByGroup, type WeekPeriod } from "@/lib/schedule";

export type CalendarBreakBand = {
  periodAfter: string;
  startMin: number;
  endMin: number;
  minutes: number;
};

export type CalendarBounds = {
  startMin: number;
  endMin: number;
  totalMinutes: number;
  hourTicks: number[];
  periodTicks: { period: string; minutes: number; start: HHMM }[];
  breakBands: CalendarBreakBand[];
};

export type CalendarEventBlock = {
  /** Stable React key within the day column. */
  key: string;
  lesson: ResolvedLesson;
  day: ResolvedDay;
  date: ISODate;
  startMin: number;
  endMin: number;
  /** End HH:MM of the whole block (may exceed `lesson.end` when consecutive lessons merge). */
  end: HHMM;
  /** Period label, e.g. "1" or "1–2" when merged/spanned. */
  periodLabel: string;
  /** True when the current wall clock sits inside this block (or one of its merged lessons). */
  live: boolean;
  /** Subgroup split position inside a shared 2-lane time slot; undefined for full-width or 3+ lane blocks. */
  half: 0 | 1 | undefined;
  /** Zero-based horizontal lane index inside an overlapping time cluster (0 for full-width blocks). */
  lane: number;
  /** Total horizontal lanes in this block's overlapping time cluster (1 for full-width blocks). */
  laneCount: number;
  /** Shared group key when two subgroups occupy the exact same time slot. */
  pairKey: string | undefined;
};

const DEFAULT_START_MIN = 8 * 60 + 15;
const DEFAULT_END_MIN = 16 * 60 + 15;
const PADDING_BEFORE_MIN = 15;
const PADDING_AFTER_MIN = 20;

const periodNum = (p: string): number => {
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
};

/** Formats minutes-since-midnight into zero-padded 24h `HH:MM`. */
export const formatMinuteLabel = (totalMinutes: number): HHMM => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Filters period-start labels so they never physically collide with whole-hour ticks or with
 * each other on the vertical time rail (e.g. a 09:55 bell right above 10:00).
 */
export const visiblePeriodTicks = (
  hourTicks: readonly number[],
  periodTicks: readonly { period: string; minutes: number; start: HHMM }[],
  pxPerMin: number,
  minGapPx = 16,
): { period: string; minutes: number; start: HHMM }[] => {
  const kept: { period: string; minutes: number; start: HHMM }[] = [];
  for (const pt of periodTicks) {
    if (pt.minutes % 60 === 0) continue;
    const hitsHour = hourTicks.some((h) => Math.abs(pt.minutes - h) * pxPerMin < minGapPx);
    if (hitsHour) continue;
    const prev = kept[kept.length - 1];
    if (prev !== undefined && Math.abs(pt.minutes - prev.minutes) * pxPerMin < minGapPx) continue;
    kept.push(pt);
  }
  return kept;
};

/** Counts distinct periods on a day that carry a substitution or change status. */
export const dayChangeCount = (day: ResolvedDay | null): number => {
  if (day === null) return 0;
  const changedPeriods = new Set<string>();
  for (const lesson of day.lessons) {
    if (lesson.status !== "normal") changedPeriods.add(lesson.period);
  }
  return changedPeriods.size;
};

/**
 * Computes the vertical minute bounds, whole-hour ruler ticks, period start guides, and
 * long-break bands for a school week.
 */
export const computeCalendarBounds = (
  days: readonly (ResolvedDay | null)[],
  periods: readonly WeekPeriod[],
): CalendarBounds => {
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  const consider = (start: HHMM, end: HHMM) => {
    const s = minutesOf(start);
    const e = minutesOf(end);
    if (s !== null && s < minStart) minStart = s;
    if (e !== null && e > maxEnd) maxEnd = e;
  };

  for (const p of periods) consider(p.start, p.end);
  for (const day of days) {
    for (const lesson of day?.lessons ?? []) {
      consider(lesson.start, lesson.end);
    }
  }

  const rawStart = Number.isFinite(minStart) ? minStart - PADDING_BEFORE_MIN : DEFAULT_START_MIN;
  const rawEnd = Number.isFinite(maxEnd) ? maxEnd + PADDING_AFTER_MIN : DEFAULT_END_MIN;

  // Snap to clean 15-minute increments so the top and bottom edges feel rhythmic.
  const startMin = Math.max(0, Math.floor(rawStart / 15) * 15);
  const endMin = Math.min(24 * 60, Math.max(startMin + 60, Math.ceil(rawEnd / 15) * 15));

  const firstHour = Math.ceil(startMin / 60) * 60;
  const hourTicks: number[] = [];
  for (let m = firstHour; m <= endMin; m += 60) {
    hourTicks.push(m);
  }

  const periodTicks: { period: string; minutes: number; start: HHMM }[] = [];
  for (const p of periods) {
    const m = minutesOf(p.start);
    if (m !== null && m >= startMin && m <= endMin) {
      periodTicks.push({ period: p.period, minutes: m, start: p.start });
    }
  }

  const breaks = longBreaks(periods);
  const breakBands: CalendarBreakBand[] = [];
  periods.forEach((current, i) => {
    const minutes = breaks.get(current.period);
    const previous = periods[i - 1];
    if (minutes === undefined || previous === undefined) return;
    const from = minutesOf(previous.end);
    const to = minutesOf(current.start);
    if (from !== null && to !== null && to > from) {
      breakBands.push({
        periodAfter: current.period,
        startMin: from,
        endMin: to,
        minutes,
      });
    }
  });

  return {
    startMin,
    endMin,
    totalMinutes: endMin - startMin,
    hourTicks,
    periodTicks,
    breakBands,
  };
};

const teacherClassSignature = (lesson: ResolvedLesson): string => {
  const tl = lesson as Partial<TeacherResolvedLesson>;
  return tl.classes?.map((c) => c.short || c.name).join("+") ?? "";
};

const sameMergeableLesson = (a: ResolvedLesson, b: ResolvedLesson): boolean =>
  (a.subject?.id ?? a.subject?.name ?? "") === (b.subject?.id ?? b.subject?.name ?? "") &&
  a.status === b.status &&
  (a.group ?? "") === (b.group ?? "") &&
  (a.building ?? "") === (b.building ?? "") &&
  a.rooms.map((r) => r.short).join(",") === b.rooms.map((r) => r.short).join(",") &&
  teacherClassSignature(a) === teacherClassSignature(b);

const periodRangeLabel = (firstPeriod: string, lastPeriodNum: number): string => {
  const firstNum = periodNum(firstPeriod);
  return lastPeriodNum > firstNum ? `${String(firstNum)}–${String(lastPeriodNum)}` : firstPeriod;
};

type DayEventOptions = {
  mergeConsecutive: boolean;
  liveLesson: ResolvedLesson | null;
};

/**
 * Builds positioned event blocks for one day column.
 *
 * Handles:
 * - Paired subgroups sharing the same period (`half: 0` left, `half: 1` right)
 * - Structural multi-period spans (`lesson.span > 1`)
 * - Optional visual coalescing of consecutive identical lessons (`mergeConsecutive`)
 */
export const buildDayEvents = (
  day: ResolvedDay | null,
  date: ISODate,
  { mergeConsecutive, liveLesson }: DayEventOptions,
): CalendarEventBlock[] => {
  if (day === null || day.lessons.length === 0) return [];

  const paired = pairByGroup(day.lessons);
  type SlotEntry =
    | {
        kind: "single";
        lesson: ResolvedLesson;
        startMin: number;
        endMin: number;
        lastPeriod: number;
      }
    | {
        kind: "pair";
        left: ResolvedLesson;
        right: ResolvedLesson;
        startMin: number;
        endMin: number;
        lastPeriod: number;
      };

  const slots: SlotEntry[] = [];
  for (const item of paired) {
    if (Array.isArray(item)) {
      const [left, right] = item as readonly [ResolvedLesson, ResolvedLesson];
      const s = minutesOf(left.start) ?? minutesOf(right.start);
      const e = minutesOf(left.end) ?? minutesOf(right.end);
      if (s === null || e === null || e <= s) continue;
      const lastPeriod = periodNum(left.period) + Math.max(1, left.span) - 1;
      slots.push({ kind: "pair", left, right, startMin: s, endMin: e, lastPeriod });
    } else {
      const lesson = item as ResolvedLesson;
      const s = minutesOf(lesson.start);
      const e = minutesOf(lesson.end);
      if (s === null || e === null || e <= s) continue;
      const lastPeriod = periodNum(lesson.period) + Math.max(1, lesson.span) - 1;
      slots.push({ kind: "single", lesson, startMin: s, endMin: e, lastPeriod });
    }
  }

  slots.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const blocks: CalendarEventBlock[] = [];
  let i = 0;

  while (i < slots.length) {
    const slot = slots[i];
    if (slot === undefined) break;

    if (slot.kind === "pair") {
      const pairKey = `${date}|${slot.left.period}|${String(i)}|pair`;
      const leftLast = periodNum(slot.left.period) + Math.max(1, slot.left.span) - 1;
      const rightLast = periodNum(slot.right.period) + Math.max(1, slot.right.span) - 1;

      blocks.push({
        key: `${date}|${slot.left.period}|${String(i)}|0`,
        lesson: slot.left,
        day,
        date,
        startMin: slot.startMin,
        endMin: slot.endMin,
        end: slot.left.end,
        periodLabel: periodRangeLabel(slot.left.period, leftLast),
        live: slot.left === liveLesson,
        half: 0,
        lane: 0,
        laneCount: 2,
        pairKey,
      });
      blocks.push({
        key: `${date}|${slot.right.period}|${String(i)}|1`,
        lesson: slot.right,
        day,
        date,
        startMin: slot.startMin,
        endMin: slot.endMin,
        end: slot.right.end,
        periodLabel: periodRangeLabel(slot.right.period, rightLast),
        live: slot.right === liveLesson,
        half: 1,
        lane: 1,
        laneCount: 2,
        pairKey,
      });
      i += 1;
      continue;
    }

    const startIndex = i;
    let endMin = slot.endMin;
    let end = slot.lesson.end;
    let lastPeriod = slot.lastPeriod;
    let live = slot.lesson === liveLesson;

    if (mergeConsecutive) {
      let j = i + 1;
      while (j < slots.length) {
        const next = slots[j];
        if (
          next === undefined ||
          next.kind !== "single" ||
          periodNum(next.lesson.period) !== lastPeriod + 1 ||
          !sameMergeableLesson(slot.lesson, next.lesson) ||
          (slot.lesson === liveLesson) !== (next.lesson === liveLesson)
        ) {
          break;
        }
        endMin = Math.max(endMin, next.endMin);
        end = next.lesson.end;
        lastPeriod = next.lastPeriod;
        live = live || next.lesson === liveLesson;
        j += 1;
      }
      i = j;
    } else {
      i += 1;
    }

    blocks.push({
      key: `${date}|${slot.lesson.period}|${String(startIndex)}`,
      lesson: slot.lesson,
      day,
      date,
      startMin: slot.startMin,
      endMin,
      end,
      periodLabel: periodRangeLabel(slot.lesson.period, lastPeriod),
      live,
      half: undefined,
      lane: 0,
      laneCount: 1,
      pairKey: undefined,
    });
  }

  // Pack overlapping time intervals into side-by-side lanes (2, 3, or more) so a cancelled lesson
  // + replacement or 3 simultaneous subgroups never cover one another.
  const clusterStartIndices: number[] = [];
  let clusterEnd = -1;
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const block = blocks[idx];
    if (block === undefined) continue;
    if (idx === 0 || block.startMin >= clusterEnd) {
      clusterStartIndices.push(idx);
      clusterEnd = block.endMin;
    } else {
      clusterEnd = Math.max(clusterEnd, block.endMin);
    }
  }

  for (let c = 0; c < clusterStartIndices.length; c += 1) {
    const from = clusterStartIndices[c] ?? 0;
    const to = clusterStartIndices[c + 1] ?? blocks.length;
    if (to - from <= 1) continue;

    // If the cluster is already a clean 2-block subgroup pair, keep its exact pair lanes.
    const first = blocks[from];
    const second = blocks[from + 1];
    if (
      to - from === 2 &&
      first !== undefined &&
      second !== undefined &&
      first.pairKey !== undefined &&
      first.pairKey === second.pairKey
    ) {
      continue;
    }

    // Greedy interval-to-lane assignment within the connected overlap cluster.
    const laneEnds: number[] = [];
    const assignedLanes: number[] = [];
    for (let idx = from; idx < to; idx += 1) {
      const block = blocks[idx];
      if (block === undefined) continue;
      let lane = laneEnds.findIndex((endTime) => endTime <= block.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(block.endMin);
      } else {
        laneEnds[lane] = block.endMin;
      }
      assignedLanes.push(lane);
    }

    const laneCount = laneEnds.length;
    if (laneCount <= 1) continue;
    const overlapKey = `${date}|overlap|${String(from)}|${String(to - 1)}`;

    for (let idx = from; idx < to; idx += 1) {
      const block = blocks[idx];
      const lane = assignedLanes[idx - from] ?? 0;
      if (block === undefined) continue;
      blocks[idx] = {
        ...block,
        lane,
        laneCount,
        half: laneCount === 2 ? (lane as 0 | 1) : undefined,
        pairKey: block.pairKey ?? (laneCount === 2 ? overlapKey : undefined),
      };
    }
  }

  return blocks;
};
