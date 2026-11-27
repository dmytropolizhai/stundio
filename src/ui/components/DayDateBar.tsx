/**
 * Wide-layout date selector bar shared by the Home (Day) and Changes views.
 *
 * Renders the display-size `DatePicker` and long date on the left, and the "Today" jump,
 * optional view-specific actions, and glass previous/next school-day chevrons on the right.
 * On phones, `DateDock` owns these controls in the thumb zone instead.
 */
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@/ds";
import { stepSchoolDay } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { formatLongDate, useLang, useT } from "@/ui/i18n";
import { DatePicker } from "./DatePicker.tsx";

type DayDateBarProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  onDateChange: (date: ISODate) => void;
  onNavigate: (dir: 1 | -1) => void;
  /** Optional pills inserted between the "Today" jump and the chevron capsule. */
  actions?: ReactNode;
};

export const DayDateBar = ({
  date,
  today,
  isToday,
  onDateChange,
  onNavigate,
  actions,
}: DayDateBarProps) => {
  const t = useT();
  const lang = useLang();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="flex flex-wrap items-center gap-2">
        {!isToday && (
          <Button
            variant="ghost"
            size="md"
            className="u-schedule-glass-chip rounded-pill px-4 text-caption"
            onClick={() => {
              onDateChange(today);
            }}
          >
            {t("day.jumpToday")}
          </Button>
        )}
        {actions}

        <div className="u-schedule-glass-chip flex shrink-0 items-center gap-0.5 rounded-pill p-0.5">
          <IconButton
            icon="chevron-left"
            label={t("day.previousDay")}
            variant="bare"
            size="md"
            onClick={() => {
              onNavigate(-1);
              onDateChange(stepSchoolDay(date, -1));
            }}
          />
          <IconButton
            icon="chevron-right"
            label={t("day.nextDay")}
            variant="bare"
            size="md"
            onClick={() => {
              onNavigate(1);
              onDateChange(stepSchoolDay(date, 1));
            }}
          />
        </div>
      </div>
    </div>
  );
};
