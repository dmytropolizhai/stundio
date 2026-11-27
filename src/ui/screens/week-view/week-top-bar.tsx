/**
 * Compact header for the Week Calendar screen.
 *
 * Holds the week date range (with prev/next chevrons, DatePicker, ClassBadge, and SyncBadge on
 * wide layouts), a zoom toggle between Detailed 2D pan and Full-Week 5-day overview on phone/tablet,
 * a direct Share action, and the ViewOptionsMenu (consecutive lesson merging).
 */
import type { CSSProperties } from "react";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { Icon, IconButton, SegmentedTabs, cn } from "@/ds";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { useT } from "@/ui/i18n";
import { useAppStore, useSettingSetter } from "@/store";
import { useIsFormTeacher } from "@/ui/persona";
import { ViewOptionsMenu } from "@/ui/components/ViewOptionsMenu.tsx";

type WeekTopBarProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  /** True when the canvas is zoomed out to fit Mon–Fri in the viewport. */
  fitted?: boolean;
  onToggleFit?: () => void;
  showShare?: boolean;
  shareDisabled?: boolean;
  shareWorking?: boolean;
  onShare?: () => void;
  onPickClass: () => void;
  className?: string;
  style?: CSSProperties;
};

export const WeekTopBar = ({
  date,
  onDateChange,
  fitted = false,
  onToggleFit,
  showShare = false,
  shareDisabled = false,
  shareWorking = false,
  onShare,
  onPickClass,
  className,
  style,
}: WeekTopBarProps) => {
  const t = useT();
  const layout = useLayout();
  const wide = layout !== "phone";
  const isDesktop = layout === "desktop";

  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
  const setMergeConsecutiveLessons = useSettingSetter("mergeConsecutiveLessons");

  const pill =
    "u-schedule-glass-chip pointer-events-auto inline-flex h-11 items-center rounded-pill";

  return (
    <header
      className={cn("flex items-center justify-center gap-2", className)}
      data-testid="week-top-bar"
      style={style}
    >
      {/* Week switcher (wide layouts only; the phone dock already steps weeks) */}
      {wide && (
        <div className={cn(pill, "shrink-0 gap-2 px-1")} data-testid="week-switcher">
          <IconButton
            icon="chevron-left"
            label={t("week.previousWeek")}
            variant="bare"
            size="sm"
            onClick={() => {
              onDateChange(addDays(date, -7));
            }}
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
      )}

      {/* Action group: class, zoom, share, view options */}
      <div className={cn(pill, "shrink-0 gap-2 px-1")}>
        {wide && <ClassBadge onClick={onPickClass} />}

        {!isDesktop && onToggleFit !== undefined && (
          <button
            type="button"
            data-testid="week-density-toggle"
            aria-label={t("week.view.zoomToggle")}
            aria-pressed={fitted}
            onClick={() => {
              onToggleFit();
            }}
            className={cn(
              "inline-flex size-9 cursor-pointer items-center justify-center rounded-pill border-0 transition-[transform,background-color,color] duration-(--dur-fast) active:scale-(--press-scale) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              fitted ? "bg-inverse text-on-inverse" : "bg-transparent text-strong",
            )}
          >
            <Icon name={fitted ? "calendar-days" : "layout-grid"} size={16} />
            <span className="sr-only">
              {fitted ? t("week.view.detailed") : t("week.view.overview")}
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
    </header>
  );
};

/** Own / form-class switch shown to form teachers; floats under the top inset. */
export const WeekTeacherSegment = () => {
  const t = useT();
  const teacherView = useAppStore((s) => s.settings.teacherView);
  const setTeacherView = useSettingSetter("teacherView");
  const isFormTeacher = useIsFormTeacher();
  if (!isFormTeacher) return null;
  return (
    <div
      className="pointer-events-auto mt-2 flex justify-center"
      data-testid="form-teacher-segment"
    >
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
  );
};
