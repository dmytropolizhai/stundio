import { IconButton, TopBar } from "@/ds";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { formatWeekRange, useLang, useT } from "@/ui/i18n";

type WeekTopBarProps = {
  date: ISODate;
  firstDay: ISODate | undefined;
  lastDay: ISODate | undefined;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onRefresh: () => void;
};

export const WeekTopBar = ({
  date,
  firstDay,
  lastDay,
  onDateChange,
  onPickClass,
  onRefresh,
}: WeekTopBarProps) => {
  const t = useT();
  const lang = useLang();

  return (
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

          <span className="min-w-0 flex-1 truncate text-center text-title">
            {firstDay !== undefined && lastDay !== undefined
              ? formatWeekRange(firstDay, lastDay, lang)
              : t("nav.week")}
          </span>

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
  );
};
