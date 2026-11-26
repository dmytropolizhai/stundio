/**
 * Collapsible liquid-glass week summary bar above the 2D calendar canvas.
 * Shows key weekly counts inline when collapsed so the calendar owns the viewport, and expands
 * smoothly on tap to reveal a 5-day workload comparison strip, busiest/lightest day, and
 * week-over-week delta.
 */
import { useState } from "react";
import { Icon, cn } from "@/ds";
import type { ISODate } from "@/lib/edupage";
import type { useWeekOverview } from "@/ui/hooks/useWeekOverview.ts";
import { formatWeekdayLong, formatWeekdayShort, useLang, useT } from "@/ui/i18n";

type WeekOverviewProps = {
  overview: NonNullable<ReturnType<typeof useWeekOverview>>;
  today?: ISODate;
  onOpenDay?: (date: ISODate) => void;
};

export const WeekOverview = ({ overview, today, onOpenDay }: WeekOverviewProps) => {
  const t = useT();
  const lang = useLang();
  const [expanded, setExpanded] = useState(false);

  const maxDayCount = Math.max(1, ...overview.days.map((d) => d.count));

  return (
    <section
      className="w-full shrink-0 border-t border-hairline/55 bg-card/55 backdrop-blur-md"
      data-testid="week-overview"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((v) => !v);
        }}
        className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-gutter py-1.5 text-left transition-colors duration-(--dur-fast) hover:bg-(--schedule-row-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="chart-column" size={15} className="shrink-0 text-muted" />
          <h2 className="m-0 font-display text-caption leading-tight font-bold tracking-[-0.015em] text-strong">
            {t("week.overview.title")}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="u-data rounded-pill bg-(--schedule-room-bg) px-2 py-0.5 text-micro font-semibold text-strong">
            {t("week.overview.lessons", { n: overview.totalLessons })}
          </span>
          {overview.changedLessons > 0 && (
            <span className="u-data rounded-pill bg-caution/18 px-2 py-0.5 text-micro font-semibold text-caution">
              {t("week.overview.changes", { n: overview.changedLessons })}
            </span>
          )}
          <Icon
            name="chevron-down"
            size={15}
            className={cn(
              "text-muted transition-transform duration-(--dur-base) ease-standard",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-(--dur-base) ease-standard",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {expanded && (
            <div className="flex flex-col gap-3 border-t border-hairline/60 px-gutter py-3">
              {/* Interactive 5-day workload bar strip */}
              {overview.days.length > 0 && (
                <div
                  className="grid grid-cols-5 gap-2 rounded-md bg-sunken/45 px-2.5 py-2.5"
                  data-testid="week-overview-bars"
                >
                  {overview.days.map((d) => {
                    const isToday = d.date === today;
                    const isBusiest = overview.busiest?.date === d.date && d.count > 0;
                    const ratio = d.count === 0 ? 0 : Math.max(0.18, d.count / maxDayCount);
                    const barHeightPx = Math.round(ratio * 28);
                    const weekday = formatWeekdayShort(d.date, lang);

                    return (
                      <button
                        key={d.date}
                        type="button"
                        disabled={onOpenDay === undefined}
                        onClick={() => {
                          onOpenDay?.(d.date);
                        }}
                        aria-label={`${formatWeekdayLong(d.date, lang)}: ${t("week.overview.lessons", { n: d.count })}`}
                        className="group flex cursor-pointer flex-col items-center gap-1 rounded-sm border-0 bg-transparent px-1 py-0.5 transition-colors duration-(--dur-fast) hover:bg-(--schedule-row-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring) disabled:cursor-default"
                      >
                        <span className="u-data text-micro leading-none font-bold text-strong tabular-nums">
                          {d.count}
                        </span>
                        <span className="flex h-7 w-full items-end justify-center">
                          <span
                            className={cn(
                              "w-full max-w-7 rounded-t-[4px] transition-all duration-(--dur-base)",
                              d.count === 0
                                ? "h-[3px] bg-hairline/70"
                                : isToday
                                  ? "bg-inverse"
                                  : isBusiest
                                    ? "bg-strong/70"
                                    : "bg-muted/45 group-hover:bg-strong/60",
                            )}
                            style={d.count > 0 ? { height: `${String(barHeightPx)}px` } : undefined}
                          />
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={cn(
                              "font-text text-[10.5px] leading-none font-bold uppercase",
                              isToday ? "text-strong" : "text-muted",
                            )}
                          >
                            {weekday}
                          </span>
                          {d.changed > 0 && (
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-caution" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Compact metric breakdown */}
              <div className="grid grid-cols-2 gap-2.5 tablet:grid-cols-4">
                <div className="rounded-md bg-sunken/55 p-3">
                  <div className="font-data text-[22px] leading-none font-black text-strong tabular-nums">
                    {overview.totalLessons}
                  </div>
                  <div className="mt-1 font-text text-caption text-muted">
                    {t("day.summary.lessonsLabel")}
                  </div>
                  {overview.lessonDelta !== null && (
                    <div className="mt-1.5 font-text text-[11px] font-semibold text-muted">
                      {overview.lessonDelta > 0
                        ? t("week.overview.lessonsUp", { n: overview.lessonDelta })
                        : overview.lessonDelta < 0
                          ? t("week.overview.lessonsDown", { n: overview.lessonDelta })
                          : t("week.overview.lessonsSame")}
                    </div>
                  )}
                </div>

                <div className="rounded-md bg-sunken/55 p-3">
                  <div
                    className={cn(
                      "font-data text-[22px] leading-none font-black tabular-nums",
                      overview.changedLessons > 0 ? "text-caution" : "text-strong",
                    )}
                  >
                    {overview.changedLessons}
                  </div>
                  <div className="mt-1 font-text text-caption text-muted">
                    {overview.changedLessons > 0
                      ? t("changes.title")
                      : t("week.overview.changesNone")}
                  </div>
                </div>

                {overview.busiest !== null && (
                  <div className="rounded-md bg-sunken/55 p-3">
                    <div className="font-text text-[10.5px] font-bold tracking-label text-muted uppercase">
                      {t("week.overview.busiestLabel")}
                    </div>
                    <div className="mt-1.5 font-display text-[17px] leading-tight font-bold text-strong">
                      {formatWeekdayLong(overview.busiest.date, lang)}
                    </div>
                    <div className="mt-0.5 font-text text-caption text-muted">
                      {t("week.overview.lessons", { n: overview.busiest.count })}
                    </div>
                  </div>
                )}

                {overview.lightest !== null &&
                  overview.lightest.date !== overview.busiest?.date && (
                    <div className="rounded-md bg-sunken/55 p-3">
                      <div className="font-text text-[10.5px] font-bold tracking-label text-muted uppercase">
                        {t("week.overview.lightestLabel")}
                      </div>
                      <div className="mt-1.5 font-display text-[17px] leading-tight font-bold text-strong">
                        {formatWeekdayLong(overview.lightest.date, lang)}
                      </div>
                      <div className="mt-0.5 font-text text-caption text-muted">
                        {t("week.overview.lessons", { n: overview.lightest.count })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
