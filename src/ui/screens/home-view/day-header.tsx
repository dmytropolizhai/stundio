/**
 * Horizon bar for the Home screen's Day schedule.
 *
 * On phones, `DateDock` and `SchoolTile` already own today's date and countdown, so redundant
 * "Today" title and long-date rows collapse into a single compact liquid-glass horizon strip
 * (browsed day pill when away from today, tappable time-span + lesson/longest-break capsule that
 * expands inline for labelled details, and the changes shortcut — both carrying 44px touch boxes
 * around their 30px visual pills), pulling lessons high into the first viewport. Wide layouts keep
 * the inline `DatePicker`, "to today" action, and 44px day-stepping chevrons.
 */
import { useEffect, useId, useState } from "react";
import { Button, Icon, cn } from "@/ds";
import type { ISODate } from "@/lib/edupage";
import type { DaySummary as Summary } from "@/lib/schedule";
import { DayDateBar } from "@/ui/components/DayDateBar.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { dayTitle } from "@/ui/lib/dayTitle.ts";
import { formatDuration, useLang, useT } from "@/ui/i18n";
import { DaySummary, DaySummaryDetails } from "./day-summary.tsx";

type DayHeaderProps = {
  date: ISODate;
  today: ISODate;
  isToday: boolean;
  /** First-to-last lesson time span (e.g. "08:30 – 14:15"). */
  timeRange?: string | undefined;
  /** Day lesson/break outline, fused into the tappable horizon capsule with `timeRange`. */
  summary?: Summary | null | undefined;
  changedLessonsCount?: number | undefined;
  onOpenChanges?: ((date: ISODate) => void) | undefined;
  onDateChange: (date: ISODate) => void;
  onNavigate: (dir: 1 | -1) => void;
};

export const DayHeader = ({
  date,
  today,
  isToday,
  timeRange,
  summary = null,
  changedLessonsCount,
  onOpenChanges,
  onDateChange,
  onNavigate,
}: DayHeaderProps) => {
  const t = useT();
  const lang = useLang();
  const wide = useLayout() !== "phone";
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [prevDate, setPrevDate] = useState(date);
  const summaryPanelId = useId();

  if (prevDate !== date) {
    setPrevDate(date);
    setSummaryExpanded(false);
  }

  useEffect(() => {
    if (!summaryExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSummaryExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [summaryExpanded]);

  const showChanges = (changedLessonsCount ?? 0) > 0 && onOpenChanges !== undefined;
  const effectiveRange =
    timeRange ?? (summary !== null ? `${summary.start} – ${summary.end}` : undefined);
  const hasFacts = effectiveRange !== undefined || summary !== null;
  const title = dayTitle(date, today, t, lang);

  const summaryAriaLabel =
    summary !== null
      ? [
          effectiveRange,
          t("day.summary.lessons", { count: summary.lessonCount }),
          summary.longestBreak !== null
            ? `${t("day.summary.longestBreak", { duration: formatDuration(summary.longestBreak.minutes) })} (${summary.longestBreak.start} – ${summary.longestBreak.end})`
            : undefined,
          t(summaryExpanded ? "day.summary.collapse" : "day.summary.expand"),
        ]
          .filter((part): part is string => part !== undefined)
          .join(". ")
      : undefined;

  const factsCapsule = hasFacts ? (
    summary !== null ? (
      <button
        type="button"
        data-testid="day-summary-toggle"
        aria-expanded={summaryExpanded}
        aria-controls={summaryPanelId}
        aria-label={summaryAriaLabel}
        onClick={() => {
          setSummaryExpanded((open) => !open);
        }}
        className="-my-1.5 inline-flex min-h-11 min-w-0 cursor-pointer items-center rounded-pill border-0 bg-transparent px-0 py-1.5 text-left transition-transform duration-(--dur-instant) ease-(--ease-out) active:scale-(--press-scale)"
      >
        <span className="u-schedule-glass-chip inline-flex h-7.5 min-w-0 items-center gap-2 rounded-pill px-2.5 font-data text-[12px] font-medium tracking-[-0.03em] tabular-nums text-strong">
          {effectiveRange !== undefined && (
            <span
              aria-hidden="true"
              data-testid="day-time-range"
              className="shrink-0 leading-none whitespace-nowrap"
            >
              {effectiveRange}
            </span>
          )}
          {effectiveRange !== undefined && (
            <span aria-hidden="true" className="h-3 w-px shrink-0 bg-(--schedule-divider)" />
          )}
          <DaySummary summary={summary} bare />
          <Icon
            name="chevron-down"
            size={12}
            className={cn(
              "shrink-0 text-muted transition-transform duration-(--dur-base) ease-(--ease-standard)",
              summaryExpanded && "rotate-180 text-strong",
            )}
          />
        </span>
      </button>
    ) : (
      <div className="u-schedule-glass-chip inline-flex min-h-7.5 min-w-0 items-center gap-2 rounded-pill px-2.5 py-1 font-data text-[12px] font-medium tracking-[-0.03em] tabular-nums text-strong">
        <span
          aria-label={effectiveRange}
          data-testid="day-time-range"
          className="shrink-0 leading-none whitespace-nowrap"
        >
          {effectiveRange}
        </span>
      </div>
    )
  ) : null;

  if (!wide) {
    const emptyToday = isToday && !hasFacts && !showChanges;

    if (emptyToday) {
      return (
        <div className="sr-only" data-testid="day-header">
          {title}
        </div>
      );
    }

    return (
      <div data-testid="day-header">
        <div className="flex items-center justify-between gap-1.5">
          <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto">
            {isToday ? (
              <span className="sr-only">{title}</span>
            ) : (
              <span className="shrink-0 font-display text-[16px] leading-none font-bold tracking-display text-strong first-letter:uppercase">
                {title}
              </span>
            )}
            {factsCapsule}
          </div>

          {showChanges && (
            <button
              type="button"
              onClick={() => {
                onOpenChanges(date);
              }}
              data-testid="day-changes-badge"
              className="-my-1.5 inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-pill border-0 bg-transparent px-0 py-1.5 font-text text-[12px] font-semibold text-strong transition-transform duration-(--dur-instant) ease-(--ease-out) active:scale-(--press-scale)"
            >
              <span className="u-schedule-glass-chip inline-flex h-7.5 items-center gap-1.5 rounded-pill px-2.5">
                <Icon name="repeat" size={14} className="shrink-0" />
                <span>{t("day.changesBadge", { n: changedLessonsCount! })}</span>
              </span>
            </button>
          )}
        </div>

        {summary !== null && (
          <DaySummaryDetails id={summaryPanelId} summary={summary} expanded={summaryExpanded} />
        )}
      </div>
    );
  }

  return (
    <div data-testid="day-header">
      <DayDateBar
        date={date}
        today={today}
        isToday={isToday}
        onDateChange={onDateChange}
        onNavigate={onNavigate}
        actions={
          <>
            {showChanges && (
              <Button
                variant="ghost"
                size="md"
                icon="repeat"
                className="u-schedule-glass-chip rounded-pill px-4 text-caption"
                onClick={() => {
                  onOpenChanges(date);
                }}
                data-testid="day-changes-badge"
              >
                {t("day.changesBadge", { n: changedLessonsCount! })}
              </Button>
            )}
            {factsCapsule}
          </>
        }
      />

      {summary !== null && (
        <DaySummaryDetails id={summaryPanelId} summary={summary} expanded={summaryExpanded} />
      )}
    </div>
  );
};
