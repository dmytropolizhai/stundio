/**
 * The header of the Home screen's day block: which day the schedule below shows, and the ways
 * to change it — arrows, the calendar, "back to today" — plus the jump to that day's changes.
 * It lives with the schedule, not at the top of the screen, because it steers only the schedule:
 * the brief above always talks about today.
 */
import { useState } from "react";
import { Button, IconButton } from "@/ds";
import { stepSchoolDay } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { DatePicker } from "@/ui/components/DatePicker.tsx";
import { formatLongDate, useLang, useT } from "@/ui/i18n";

type DayHeaderProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  changedLessonsCount?: number | undefined;
  onOpenChanges?: ((date: ISODate) => void) | undefined;
  onDateChange: (date: ISODate) => void;
  onNavigate: (dir: 1 | -1) => void;
};

export const DayHeader = ({
  date,
  today,
  isToday,
  changedLessonsCount,
  onOpenChanges,
  onDateChange,
  onNavigate,
}: DayHeaderProps) => {
  const t = useT();
  const lang = useLang();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const showChanges = (changedLessonsCount ?? 0) > 0 && onOpenChanges !== undefined;

  return (
    <div className="mt-2" data-testid="day-header">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-display-2 leading-none tracking-display text-strong">
            <DatePicker
              date={date}
              today={today}
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
              onSelect={onDateChange}
            />
          </div>
          <p className="mt-1 font-text text-caption text-muted first-letter:uppercase">
            {formatLongDate(date, lang)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            icon="chevron-left"
            label={t("day.previousDay")}
            variant="light"
            size="sm"
            onClick={() => {
              onNavigate(-1);
              onDateChange(stepSchoolDay(date, -1));
            }}
          />
          <IconButton
            icon="chevron-right"
            label={t("day.nextDay")}
            variant="light"
            size="sm"
            onClick={() => {
              onNavigate(1);
              onDateChange(stepSchoolDay(date, 1));
            }}
          />
        </div>
      </div>

      {(!isToday || showChanges) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDateChange(today);
              }}
            >
              {t("day.jumpToday")}
            </Button>
          )}
          {showChanges && (
            <Button
              variant="outline"
              size="sm"
              icon="repeat"
              onClick={() => {
                onOpenChanges(date);
              }}
              data-testid="day-changes-badge"
            >
              {t("day.changesBadge", { n: changedLessonsCount! })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
