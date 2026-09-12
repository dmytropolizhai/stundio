/**
 * Stats for the WeekView overview: this week's lesson/change counts, the busiest and
 * lightest day, and the lesson-count delta against the previous week.
 *
 * The previous week's comparison degrades gracefully: `lessonDelta` is `null` whenever none
 * of the previous week's days resolve (its timetable was never cached), rather than treating
 * a missing week as zero lessons.
 */
import { useMemo } from "react";
import { useAppStore } from "../../store/index.ts";
import { addDays } from "../../sync/index.ts";
import { weekDates } from "../../lib/schedule/index.ts";
import type { ISODate } from "../../lib/edupage/index.ts";

export type WeekOverview = {
  totalLessons: number;
  changedLessons: number;
  busiest: { date: ISODate; count: number } | null;
  lightest: { date: ISODate; count: number } | null;
  /** This week's total minus last week's; `null` if last week isn't cached. */
  lessonDelta: number | null;
};

export const useWeekOverview = (date: ISODate): WeekOverview | null => {
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);
  const classId = useAppStore((s) => s.settings.selectedClassId);

  return useMemo(() => {
    if (classId === null) return null;

    const dates = weekDates(date);
    const days = dates.map((d) => resolvedDay(d));

    let totalLessons = 0;
    let changedLessons = 0;
    let busiest: { date: ISODate; count: number } | null = null;
    let lightest: { date: ISODate; count: number } | null = null;

    dates.forEach((d, i) => {
      const day = days[i];
      if (day === null || day === undefined) return;
      const count = day.lessons.length;
      totalLessons += count;
      changedLessons += day.lessons.filter((l) => l.status !== "normal").length;
      if (count === 0) return;
      if (busiest === null || count > busiest.count) busiest = { date: d, count };
      if (lightest === null || count < lightest.count) lightest = { date: d, count };
    });

    if (busiest === null) return null;

    const prevDates = weekDates(addDays(date, -7));
    const prevDays = prevDates.map((d) => resolvedDay(d));
    const prevAvailable = prevDays.some((d) => d !== null);
    const prevTotal = prevDays.reduce((sum, day) => sum + (day?.lessons.length ?? 0), 0);

    return {
      totalLessons,
      changedLessons,
      busiest,
      lightest,
      lessonDelta: prevAvailable ? totalLessons - prevTotal : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
  }, [date, resolvedDay, timetables, substitutions, classId]);
};
