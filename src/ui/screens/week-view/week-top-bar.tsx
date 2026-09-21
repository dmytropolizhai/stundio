import { useState } from "react";
import { Button, IconButton, TopBar } from "@/ds";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { DatePicker } from "@/ui/components/DatePicker.tsx";
import { formatWeekRange, useLang, useT } from "@/ui/i18n";

type WeekTopBarProps = {
  date: ISODate;
  today: ISODate;
  isThisWeek: boolean;
  firstDay: ISODate | undefined;
  lastDay: ISODate | undefined;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onRefresh: () => void;
};

export const WeekTopBar = ({
  date,
  today,
  isThisWeek,
  firstDay,
  lastDay,
  onDateChange,
  onPickClass,
  onRefresh,
}: WeekTopBarProps) => {
  const t = useT();
  const lang = useLang();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      <TopBar
        title={
          <div className="flex items-center gap-0.5">
            <IconButton
              icon="chevron-left"
              label={t("week.previousWeek")}
              variant="bare"
              size="sm"
              onClick={() => {
                onDateChange(addDays(date, -7));
              }}
            />

            <DatePicker
              date={date}
              today={today}
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
              onSelect={onDateChange}
              title={
                firstDay !== undefined && lastDay !== undefined
                  ? formatWeekRange(firstDay, lastDay, lang)
                  : t("nav.week")
              }
            />

            <IconButton
              icon="chevron-right"
              label={t("week.nextWeek")}
              variant="bare"
              size="sm"
              onClick={() => {
                onDateChange(addDays(date, 7));
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

      {!isThisWeek && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateChange(today);
            }}
          >
            {t("day.jumpToday")}
          </Button>
        </div>
      )}
    </>
  );
};
