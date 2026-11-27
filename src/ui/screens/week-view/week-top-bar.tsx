/**
 * Compact header for the Week Calendar screen.
 *
 * Holds the week switcher (on wide layouts), a zoom toggle between Detailed 2D pan and Full-Week
 * 5-day overview on phone/tablet, a direct Share action, and a direct toggle for merging
 * consecutive identical lessons.
 */
import { useState, type CSSProperties } from "react";
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { Icon, IconButton, Popover, PopoverContent, PopoverTrigger, SegmentedTabs, cn } from "@/ds";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { useT } from "@/ui/i18n";
import { useAppStore, useSettingSetter } from "@/store";
import { useIsFormTeacher } from "@/ui/persona";

type WeekTopBarProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  /** True when the canvas is zoomed out to fit Mon–Fri in the viewport. */
  fitted?: boolean;
  onToggleFit?: () => void;
  showShare?: boolean;
  shareDisabled?: boolean;
  shareWorking?: boolean;
  shareCopied?: boolean;
  onShare?: () => void;
  onShareLink?: () => void;
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
  shareCopied = false,
  onShare,
  onShareLink,
  onPickClass,
  className,
  style,
}: WeekTopBarProps) => {
  const t = useT();
  const layout = useLayout();
  const wide = layout !== "phone";
  const isDesktop = layout === "desktop";
  const [shareOpen, setShareOpen] = useState(false);

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

      {/* Action group: class, zoom, share, merge lessons */}
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

        {showShare && (onShare !== undefined || onShareLink !== undefined) && (
          <Popover open={shareOpen} onOpenChange={setShareOpen}>
            <PopoverTrigger asChild>
              <IconButton
                icon={shareCopied ? "check" : "share-2"}
                label={
                  shareWorking
                    ? t("share.working")
                    : shareCopied
                      ? t("share.linkCopied")
                      : t("share.week")
                }
                variant="bare"
                size="sm"
                disabled={shareDisabled}
                data-testid="share-week"
              />
            </PopoverTrigger>
            <PopoverContent
              side={wide ? "bottom" : "top"}
              align="end"
              className="z-50 p-1.5"
              aria-label={t("share.week")}
            >
              <div role="group" className="flex flex-col">
                {onShareLink !== undefined && (
                  <button
                    type="button"
                    data-testid="share-week-link"
                    onClick={() => {
                      setShareOpen(false);
                      onShareLink();
                    }}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-left transition-colors duration-(--dur-fast) hover:bg-(--btn-ghost-hover)"
                  >
                    <Icon name="link" size={18} className="text-strong" />
                    <span className="font-text text-body font-bold text-strong">
                      {t("share.link")}
                    </span>
                  </button>
                )}
                {onShare !== undefined && (
                  <button
                    type="button"
                    data-testid="share-week-image"
                    onClick={() => {
                      setShareOpen(false);
                      onShare();
                    }}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-left transition-colors duration-(--dur-fast) hover:bg-(--btn-ghost-hover)"
                  >
                    <Icon name="image" size={18} className="text-strong" />
                    <span className="font-text text-body font-bold text-strong">
                      {t("share.image")}
                    </span>
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <IconButton
          icon="layers"
          label={t("settings.mergeLessons")}
          variant={mergeConsecutive ? "solid" : "bare"}
          size="sm"
          aria-pressed={mergeConsecutive}
          onClick={() => {
            void setMergeConsecutiveLessons(!mergeConsecutive);
          }}
          data-testid="week-merge-toggle"
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
