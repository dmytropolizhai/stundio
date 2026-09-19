import { useState } from "react";
import { Button, IconButton, TopBar } from "@/ds";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { DatePicker } from "@/ui/components/DatePicker.tsx";
import { useT } from "@/ui/i18n";

type DayTopBarProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  changedLessonsCount?: number | undefined;
  onOpenChanges?: ((date: ISODate) => void) | undefined;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onRefresh: () => void;
  onNavigate: (dir: 1 | -1) => void;
};

export const DayTopBar = ({
  date,
  today,
  isToday,
  changedLessonsCount,
  onOpenChanges,
  onDateChange,
  onPickClass,
  onRefresh,
  onNavigate,
}: DayTopBarProps) => {
  const t = useT();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      <TopBar
        title={
          <div className="flex items-center gap-0.5">
            <IconButton
              icon="chevron-left"
              label={t("day.previousDay")}
              variant="bare"
              size="sm"
              onClick={() => {
                onNavigate(-1);
                onDateChange(addDays(date, -1));
              }}
            />

            <DatePicker
              date={date}
              today={today}
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
              onSelect={onDateChange}
            />

            <IconButton
              icon="chevron-right"
              label={t("day.nextDay")}
              variant="bare"
              size="sm"
              onClick={() => {
                onNavigate(1);
                onDateChange(addDays(date, 1));
              }}
            />
          </div>
        }
        actions={
          <>
            <ClassBadge onClick={onPickClass} />
            <SyncBadge onRetry={onRefresh} />
          </>
        }
      />

      {(!isToday || ((changedLessonsCount ?? 0) > 0 && onOpenChanges !== undefined)) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
          {(changedLessonsCount ?? 0) > 0 && onOpenChanges !== undefined && (
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
    </>
  );
};
