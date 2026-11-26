/**
 * Compact header for the Week Calendar screen.
 *
 * Holds the week date range (with prev/next chevrons, DatePicker, ClassBadge, and SyncBadge on
 * wide layouts), a zoom toggle between Detailed 2D pan and Full-Week 5-day overview on phone/tablet,
 * a direct Share action, and the ViewOptionsMenu (consecutive lesson merging).
 */
import { useState } from "react";
import { Button, Icon, IconButton, SegmentedTabs, TopBar, cn } from "@/ds";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { DatePicker } from "@/ui/components/DatePicker.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { formatWeekRange, useLang, useT } from "@/ui/i18n";
import { useAppStore, useSettingSetter } from "@/store";
import { useIsFormTeacher } from "@/ui/persona";
import { ViewOptionsMenu } from "@/ui/components/ViewOptionsMenu.tsx";
import type { CalendarDensity } from "./week-calendar-event.tsx";

type WeekTopBarProps = {
  date: ISODate;
  today: ISODate;
  isThisWeek: boolean;
  firstDay: ISODate | undefined;
  lastDay: ISODate | undefined;
  density?: CalendarDensity;
  onDensityChange?: (density: CalendarDensity) => void;
  showShare?: boolean;
  shareDisabled?: boolean;
  shareWorking?: boolean;
  onShare?: () => void;
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
  density = "detailed",
  onDensityChange,
  showShare = false,
  shareDisabled = false,
  shareWorking = false,
  onShare,
  onDateChange,
  onPickClass,
  onRefresh,
}: WeekTopBarProps) => {
  const t = useT();
  const lang = useLang();
  const layout = useLayout();
  const wide = layout !== "phone";
  const isDesktop = layout === "desktop";
  const [calendarOpen, setCalendarOpen] = useState(false);

  const teacherView = useAppStore((s) => s.settings.teacherView);
  const setTeacherView = useSettingSetter("teacherView");
  const isFormTeacher = useIsFormTeacher();
  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
  const setMergeConsecutiveLessons = useSettingSetter("mergeConsecutiveLessons");

  const weekRangeTitle =
    firstDay !== undefined && lastDay !== undefined
      ? formatWeekRange(firstDay, lastDay, lang)
      : t("nav.week");

  return (
    <>
      <TopBar
        className="desktop-week-header"
        title={
          wide ? (
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
                title={weekRangeTitle}
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
          ) : (
            weekRangeTitle
          )
        }
        actions={
          <div className="flex items-center gap-1.5">
            {wide && (
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge onRetry={onRefresh} />
              </>
            )}

            {!isDesktop && onDensityChange !== undefined && (
              <button
                type="button"
                data-testid="week-density-toggle"
                aria-label={t("week.view.zoomToggle")}
                aria-pressed={density === "overview"}
                onClick={() => {
                  onDensityChange(density === "detailed" ? "overview" : "detailed");
                }}
                className={cn(
                  "u-schedule-glass-chip inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-pill px-3 font-text text-caption font-bold transition-[transform,background-color,color] duration-(--dur-fast) active:scale-(--press-scale) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  density === "overview" ? "bg-inverse text-on-inverse" : "text-strong",
                )}
              >
                <Icon name={density === "detailed" ? "layout-grid" : "calendar-days"} size={15} />
                <span className="hidden xs:inline">
                  {density === "detailed" ? t("week.view.overview") : t("week.view.detailed")}
                </span>
              </button>
            )}

            {showShare && onShare !== undefined && (
              <IconButton
                icon="share-2"
                label={shareWorking ? t("share.working") : t("share.week")}
                variant="bare"
                size="sm"
                disabled={shareDisabled}
                onClick={onShare}
                data-testid="share-week"
              />
            )}

            <ViewOptionsMenu
              options={[
                {
                  key: "mergeLessons",
                  icon: "layout-grid",
                  label: t("settings.mergeLessons"),
                  checked: mergeConsecutive,
                  onChange: (checked) => {
                    void setMergeConsecutiveLessons(checked);
                  },
                },
              ]}
            />
          </div>
        }
      />

      {isFormTeacher && (
        <div className="mb-3 flex justify-center" data-testid="form-teacher-segment">
          <SegmentedTabs<"own" | "form-class">
            label={t("teacher.formClass")}
            items={[
              { key: "own", label: t("teacher.view.own") },
              { key: "form-class", label: t("teacher.view.formClass") },
            ]}
            value={teacherView}
            onChange={(v) => {
              void setTeacherView(v);
            }}
          />
        </div>
      )}

      {wide && !isThisWeek && (
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
