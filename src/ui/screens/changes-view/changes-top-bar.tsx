/**
 * Header for the Changes screen.
 *
 * Matches the Home (Day) view's date selector: on phones, `DateDock` owns day stepping, the
 * calendar picker, and the "Today" jump, so the top bar shows just the screen title (and the
 * browsed day eyebrow when away from today). Wide layouts keep `ClassBadge` + `SyncBadge` in the
 * top bar and render the shared `DayDateBar` underneath.
 */
import { TopBar } from "@/ds";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { DayDateBar } from "@/ui/components/DayDateBar.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { dayTitle } from "@/ui/lib/dayTitle.ts";
import { useLang, useT } from "@/ui/i18n";

type ChangesTopBarProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onRefresh: () => void;
  onNavigate: (dir: 1 | -1) => void;
};

export const ChangesTopBar = ({
  date,
  today,
  isToday,
  onDateChange,
  onPickClass,
  onRefresh,
  onNavigate,
}: ChangesTopBarProps) => {
  const t = useT();
  const lang = useLang();
  const wide = useLayout() !== "phone";

  return (
    <>
      <TopBar
        title={t("changes.title")}
        eyebrow={!wide && !isToday ? dayTitle(date, today, t, lang) : undefined}
        actions={
          wide ? (
            <>
              <ClassBadge onClick={onPickClass} />
              <SyncBadge onRetry={onRefresh} />
            </>
          ) : undefined
        }
      />

      {wide && (
        <div className="mt-3">
          <DayDateBar
            date={date}
            today={today}
            isToday={isToday}
            onDateChange={onDateChange}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </>
  );
};
