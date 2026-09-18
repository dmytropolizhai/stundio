import { lazy, Suspense, useState } from "react";
import { Button, IconButton, TopBar } from "@/ds";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { useLang, useT } from "@/ui/i18n";
import { dayTitle } from "@/ui/lib/dayTitle.ts";

const DatePicker = lazy(() =>
  import("@/ui/components/DatePicker.tsx").then((m) => ({ default: m.DatePicker })),
);

type DayTopBarProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onRefresh: () => void;
  onNavigate: (dir: 1 | -1) => void;
};

export const DayTopBar = ({
  date,
  today,
  isToday,
  onDateChange,
  onPickClass,
  onRefresh,
  onNavigate,
}: DayTopBarProps) => {
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
              label={t("day.previousDay")}
              variant="bare"
              size="sm"
              onClick={() => {
                onNavigate(-1);
                onDateChange(addDays(date, -1));
              }}
            />

            <Suspense fallback={<span>{dayTitle(date, today, t, lang)}</span>}>
              <DatePicker
                date={date}
                today={today}
                open={calendarOpen}
                onOpenChange={setCalendarOpen}
                onSelect={onDateChange}
              />
            </Suspense>

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

      {!isToday && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
