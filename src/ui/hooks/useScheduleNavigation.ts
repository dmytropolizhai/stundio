/**
 * Single-responsibility coordinator for schedule navigation and date synchronization.
 *
 * Keeps Day, Week, and Changes views in sync with respect to:
 * - Active date and today's date in Europe/Riga.
 * - Week range (firstDay, lastDay, weekDates).
 * - Day stepping (+/- 1 day) and Week stepping (+/- 7 days).
 * - "Today" jumping and calendar date selection.
 * - Checking if current date is today or falls into current week.
 */
import { useCallback, useMemo, useState } from "react";
import { todayInRiga } from "@/sync";
import { addDays } from "@/sync/schoolDays.ts";
import { weekDates } from "@/lib/schedule";
import type { ISODate } from "@/lib/edupage";
import { useNow } from "@/ui/hooks/useNow.ts";

export type ScheduleNavigation = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  isThisWeek: boolean;
  firstDay: ISODate | undefined;
  lastDay: ISODate | undefined;
  weekDates: ISODate[];
  setDate: (date: ISODate) => void;
  nextDay: () => void;
  prevDay: () => void;
  nextWeek: () => void;
  prevWeek: () => void;
  jumpToToday: () => void;
};

export type UseScheduleNavigationOptions = {
  date?: ISODate;
  onDateChange?: (date: ISODate) => void;
};

export const useScheduleNavigation = (
  options?: UseScheduleNavigationOptions,
): ScheduleNavigation => {
  const [internalDate, setInternalDate] = useState<ISODate>(() => options?.date ?? todayInRiga());

  const date = options?.date ?? internalDate;
  const onDateChange = options?.onDateChange ?? setInternalDate;

  const now = useNow();
  const today = now.date;
  const isToday = date === today;

  const dates = useMemo(() => weekDates(date), [date]);
  const firstDay = dates[0];
  const lastDay = dates[dates.length - 1];

  const isThisWeek = useMemo(() => dates.includes(today), [dates, today]);

  const nextDay = useCallback(() => {
    onDateChange(addDays(date, 1));
  }, [date, onDateChange]);

  const prevDay = useCallback(() => {
    onDateChange(addDays(date, -1));
  }, [date, onDateChange]);

  const nextWeek = useCallback(() => {
    onDateChange(addDays(date, 7));
  }, [date, onDateChange]);

  const prevWeek = useCallback(() => {
    onDateChange(addDays(date, -7));
  }, [date, onDateChange]);

  const jumpToToday = useCallback(() => {
    onDateChange(today);
  }, [today, onDateChange]);

  return {
    date,
    today,
    isToday,
    isThisWeek,
    firstDay,
    lastDay,
    weekDates: dates,
    setDate: onDateChange,
    nextDay,
    prevDay,
    nextWeek,
    prevWeek,
    jumpToToday,
  };
};
