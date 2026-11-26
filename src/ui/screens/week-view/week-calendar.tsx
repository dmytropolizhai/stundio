/**
 * Free 2D-pannable liquid-glass Week Calendar canvas.
 *
 * Renders Mon–Fri on a proportional wall-clock minute axis inside a single hardware-accelerated
 * 2D scroll viewport (`overflow-auto`) with sticky frosted weekday headers on top and a sticky
 * Martian Mono time rail on the left.
 *
 * - Detailed mode (default on phones/tablets): wide ~172px day columns so every lesson displays
 *   its full subject name, room capsule, time range, teacher/group, and building pill; smoothly
 *   auto-centers on Today and the live time on mount or week change.
 * - Overview mode (toggleable on phones/tablets): fits all 5 columns side-by-side while keeping
 *   proportional time heights so the whole week's rhythm compares at a glance.
 * - Desktop: all 5 columns naturally span the wide canvas at full detailed fidelity.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayProgress, type RigaClock, type WeekPeriod } from "@/lib/schedule";
import { Icon, cn } from "@/ds";
import { formatWeekdayShort, useLang, useT } from "@/ui/i18n";
import {
  buildDayEvents,
  computeCalendarBounds,
  dayChangeCount,
  formatMinuteLabel,
  visiblePeriodTicks,
  type CalendarEventBlock,
} from "./week-calendar-layout.ts";
import { WeekCalendarEvent, type CalendarDensity } from "./week-calendar-event.tsx";

const PX_PER_MINUTE: Record<CalendarDensity, number> = {
  detailed: 2.05,
  overview: 1.2,
};

const TIME_RAIL_WIDTH: Record<CalendarDensity, number> = {
  detailed: 52,
  overview: 40,
};

const HEADER_HEIGHT = 54;
const DETAILED_COL_WIDTH = 180;

type WeekCalendarProps = {
  dates: readonly ISODate[];
  days: readonly (ResolvedDay | null)[];
  periods: readonly WeekPeriod[];
  now: RigaClock;
  density: CalendarDensity;
  isDesktop: boolean;
  mergeConsecutive: boolean;
  filled: boolean;
  subjectColorOverrides: Record<string, string>;
  groupColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  highlightCoverLessons: boolean;
  onOpenDay: (date: ISODate) => void;
  onSelectLesson: (lesson: ResolvedLesson, day: ResolvedDay, end: string) => void;
};

const dayNumberOf = (date: ISODate): string => {
  const part = date.split("-")[2];
  return part === undefined ? "" : String(Number(part));
};

export const WeekCalendar = ({
  dates,
  days,
  periods,
  now,
  density,
  isDesktop,
  mergeConsecutive,
  filled,
  subjectColorOverrides,
  groupColorOverrides,
  colorCodingEnabled,
  highlightCoverLessons,
  onOpenDay,
  onSelectLesson,
}: WeekCalendarProps) => {
  const t = useT();
  const lang = useLang();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const effectiveDensity: CalendarDensity = isDesktop ? "detailed" : density;
  const pxPerMin = PX_PER_MINUTE[effectiveDensity];
  const timeRailWidth = TIME_RAIL_WIDTH[effectiveDensity];
  const bounds = useMemo(() => computeCalendarBounds(days, periods), [days, periods]);
  const canvasHeight = Math.round(bounds.totalMinutes * pxPerMin);
  const railPeriodTicks = useMemo(
    () =>
      effectiveDensity === "detailed"
        ? visiblePeriodTicks(bounds.hourTicks, bounds.periodTicks, pxPerMin, 16)
        : [],
    [bounds.hourTicks, bounds.periodTicks, effectiveDensity, pxPerMin],
  );

  const todayIndex = dates.indexOf(now.date);
  const todayProgress = useMemo(
    () => (todayIndex === -1 ? null : dayProgress(days[todayIndex] ?? null, now)),
    [days, now, todayIndex],
  );
  const liveLesson = todayProgress?.current ?? null;

  const dayColumns = useMemo(
    () =>
      dates.map((d, i) => {
        const day = days[i] ?? null;
        const events = buildDayEvents(day, d, {
          mergeConsecutive,
          liveLesson: d === now.date ? liveLesson : null,
        });
        return {
          date: d,
          dayNumber: dayNumberOf(d),
          weekday: formatWeekdayShort(d, lang),
          today: d === now.date,
          lessonCount: day?.lessons.filter((l) => l.status !== "cancelled").length ?? 0,
          changeCount: dayChangeCount(day),
          events,
        };
      }),
    [dates, days, lang, liveLesson, mergeConsecutive, now.date],
  );

  const syncScrollFlags = useCallback(() => {
    const el = scrollRef.current;
    const box = containerRef.current;
    if (el === null || box === null) return;
    if (el.scrollLeft > 4) {
      box.setAttribute("data-scrolled-x", "true");
    } else {
      box.removeAttribute("data-scrolled-x");
    }
    if (el.scrollTop > 4) {
      box.setAttribute("data-scrolled-y", "true");
    } else {
      box.removeAttribute("data-scrolled-y");
    }
  }, []);

  const scrollToNow = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = scrollRef.current;
      if (el === null) return;

      const targetX =
        !isDesktop && effectiveDensity === "detailed" && todayIndex > 0
          ? Math.max(0, todayIndex * DETAILED_COL_WIDTH - 24)
          : 0;

      const targetY =
        todayIndex !== -1 && now.minutes >= bounds.startMin && now.minutes <= bounds.endMin
          ? Math.max(0, (now.minutes - bounds.startMin) * pxPerMin - 140)
          : 0;

      if (typeof el.scrollTo === "function" && behavior === "smooth") {
        el.scrollTo({ left: targetX, top: targetY, behavior: "smooth" });
      } else {
        el.scrollLeft = targetX;
        el.scrollTop = targetY;
      }
      syncScrollFlags();
    },
    [
      bounds.endMin,
      bounds.startMin,
      effectiveDensity,
      isDesktop,
      now.minutes,
      pxPerMin,
      syncScrollFlags,
      todayIndex,
    ],
  );

  // Auto-focus today's column and current time (or morning start) when opening or switching weeks.
  const weekKey = dates[0] ?? "";
  useEffect(() => {
    scrollToNow("auto");
    // Intentionally triggers only on week / density / layout switches, not every minute tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, effectiveDensity, isDesktop]);

  // Passive scroll listener keeps sticky header/rail depth shadows synced with zero React re-renders.
  useEffect(() => {
    const el = scrollRef.current;
    if (el === null) return;
    syncScrollFlags();
    el.addEventListener("scroll", syncScrollFlags, { passive: true });
    return () => {
      el.removeEventListener("scroll", syncScrollFlags);
    };
  }, [syncScrollFlags]);

  const showNowLine =
    todayIndex !== -1 && now.minutes >= bounds.startMin && now.minutes <= bounds.endMin;
  const nowTopPx = showNowLine ? Math.round((now.minutes - bounds.startMin) * pxPerMin) : 0;

  const isHorizontalPan = !isDesktop && effectiveDensity === "detailed";
  const gridTemplateColumns = isHorizontalPan
    ? `${String(timeRailWidth)}px repeat(${String(dates.length)}, ${String(DETAILED_COL_WIDTH)}px)`
    : `${String(timeRailWidth)}px repeat(${String(dates.length)}, minmax(0, 1fr))`;

  const handleSelectEvent = useCallback(
    (block: CalendarEventBlock) => {
      const resolved =
        block.end > block.lesson.end ? { ...block.lesson, end: block.end } : block.lesson;
      onSelectLesson(resolved, block.day, block.end);
    },
    [onSelectLesson],
  );

  return (
    <div
      ref={containerRef}
      data-testid="week-calendar"
      data-density={effectiveDensity}
      className="u-week-canvas flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-hairline/70"
    >
      <div
        ref={scrollRef}
        data-testid="week-calendar-scroll"
        role="region"
        aria-label={t("nav.week")}
        className="u-week-scrollbar relative min-h-0 flex-1 overflow-auto overscroll-contain"
        style={{
          touchAction: isHorizontalPan ? "pan-x pan-y" : "pan-y",
        }}
      >
        <div
          className="relative grid"
          style={{
            gridTemplateColumns,
            minWidth: isHorizontalPan
              ? `${String(timeRailWidth + dates.length * DETAILED_COL_WIDTH)}px`
              : "100%",
            paddingBottom: "var(--nav-safe)",
          }}
        >
          {/* Sticky top-left corner cell: recenter on Today/Now when viewing this week */}
          {todayIndex !== -1 ? (
            <button
              type="button"
              data-testid="week-recenter"
              aria-label={t("day.jumpToday")}
              title={t("day.jumpToday")}
              onClick={() => {
                scrollToNow("smooth");
              }}
              className="u-week-sticky-corner sticky top-0 left-0 z-30 flex cursor-pointer items-center justify-center border-0 text-muted transition-colors duration-(--dur-fast) hover:text-strong focus-visible:z-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
              style={{ height: `${String(HEADER_HEIGHT)}px` }}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon name="clock" size={14} />
                {showNowLine && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-1 size-1.5 rounded-full"
                    style={{ backgroundColor: "var(--lamp-mark)" }}
                  />
                )}
              </span>
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="u-week-sticky-corner sticky top-0 left-0 z-30 flex items-center justify-center text-muted/70"
              style={{ height: `${String(HEADER_HEIGHT)}px` }}
            >
              <Icon name="clock" size={13} />
            </div>
          )}

          {/* Sticky weekday header cells (Mon–Fri) */}
          {dayColumns.map((col) => (
            <button
              key={col.date}
              type="button"
              {...(col.today ? { "aria-current": "date" as const } : {})}
              onClick={() => {
                onOpenDay(col.date);
              }}
              style={{ height: `${String(HEADER_HEIGHT)}px` }}
              className={cn(
                "u-week-sticky-header sticky top-0 z-20 flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 border-l border-hairline/55 px-1.5",
                "transition-colors duration-(--dur-fast) hover:bg-(--schedule-row-hover)",
                "focus-visible:z-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)",
                // Preserve `tracking-label` so assistive styling and weekday-header selectors agree.
                "tracking-label",
              )}
            >
              <span
                className={cn(
                  "max-w-full truncate font-text text-[10.5px] leading-none font-bold uppercase",
                  col.today ? "text-strong" : "text-muted",
                )}
              >
                {col.weekday}
              </span>
              <span className="relative inline-flex items-center justify-center">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-pill px-1.5 font-data text-caption leading-none font-bold tabular-nums",
                    col.today ? "bg-inverse text-on-inverse shadow-card" : "text-strong",
                  )}
                >
                  {col.dayNumber}
                </span>
                {col.changeCount > 0 && (
                  <span
                    aria-hidden="true"
                    data-testid="week-day-change-dot"
                    className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-caution ring-1 ring-card"
                  />
                )}
              </span>
              {col.today && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] rounded-t-full"
                  style={{
                    backgroundColor: showNowLine ? "var(--lamp-mark)" : "var(--text-strong)",
                  }}
                />
              )}
            </button>
          ))}

          {/* Sticky left time rail */}
          <div
            className="u-week-sticky-rail sticky left-0 z-15 relative select-none"
            style={{ height: `${String(canvasHeight)}px` }}
          >
            {bounds.hourTicks.map((minutes) => {
              const top = Math.round((minutes - bounds.startMin) * pxPerMin);
              return (
                <span
                  key={`h-${String(minutes)}`}
                  className={cn(
                    "u-data absolute -translate-y-1/2 leading-none font-medium text-muted",
                    effectiveDensity === "overview"
                      ? "right-1 text-[9.5px]"
                      : "right-1.5 text-[10.5px]",
                  )}
                  style={{ top: `${String(top)}px` }}
                >
                  {formatMinuteLabel(minutes)}
                </span>
              );
            })}

            {railPeriodTicks.map((pt) => {
              const top = Math.round((pt.minutes - bounds.startMin) * pxPerMin);
              return (
                <span
                  key={`pt-${pt.period}`}
                  aria-hidden="true"
                  className="u-data absolute right-1.5 -translate-y-1/2 text-micro leading-none text-muted/55"
                  style={{ top: `${String(top)}px` }}
                >
                  {pt.start}
                </span>
              );
            })}

            {/* Live current-time pill in `--lamp` on the sticky rail */}
            {showNowLine && (
              <span
                data-testid="week-now-pill"
                className="u-data absolute right-0.5 left-0.5 z-20 flex -translate-y-1/2 items-center justify-center rounded-pill py-0.5 text-[9.5px] leading-none font-bold shadow-card"
                style={{
                  top: `${String(nowTopPx)}px`,
                  backgroundColor: "var(--lamp)",
                  color: "var(--lamp-ink)",
                }}
              >
                {formatMinuteLabel(now.minutes)}
              </span>
            )}
          </div>

          {/* Mon–Fri proportional day columns */}
          {dayColumns.map((col, colIdx) => (
            <div
              key={`col-${col.date}`}
              className={cn(
                "relative border-l border-hairline/55",
                col.today && "u-week-today-col",
              )}
              style={{ height: `${String(canvasHeight)}px` }}
            >
              {/* Whole-hour horizontal guide lines */}
              {bounds.hourTicks.map((minutes) => {
                const top = Math.round((minutes - bounds.startMin) * pxPerMin);
                return (
                  <span
                    key={`line-h-${String(minutes)}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 h-px bg-hairline/70"
                    style={{ top: `${String(top)}px` }}
                  />
                );
              })}

              {/* Subtle period-start hairlines */}
              {bounds.periodTicks.map((pt) => {
                if (pt.minutes % 60 === 0) return null;
                const top = Math.round((pt.minutes - bounds.startMin) * pxPerMin);
                return (
                  <span
                    key={`line-p-${pt.period}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 h-px bg-hairline/30"
                    style={{ top: `${String(top)}px` }}
                  />
                );
              })}

              {/* Long-break bands (lunch / big break) */}
              {bounds.breakBands.map((band) => {
                const top = Math.round((band.startMin - bounds.startMin) * pxPerMin);
                const height = Math.max(16, Math.round((band.endMin - band.startMin) * pxPerMin));
                const label = t("week.longBreak", { min: String(band.minutes) });
                const isLabelCol = colIdx === (todayIndex !== -1 ? todayIndex : 0);
                return (
                  <div
                    key={`brk-${band.periodAfter}`}
                    {...(isLabelCol
                      ? { "data-testid": "week-break", role: "separator", "aria-label": label }
                      : { "aria-hidden": true })}
                    className="u-week-break-band pointer-events-none absolute inset-x-0 z-0 flex items-center justify-center px-1.5"
                    style={{ top: `${String(top)}px`, height: `${String(height)}px` }}
                  >
                    {isLabelCol ? (
                      <span className="truncate font-text text-micro font-bold tracking-label text-muted/85 uppercase tabular-nums">
                        {label}
                      </span>
                    ) : (
                      isHorizontalPan && (
                        <span className="truncate font-data text-micro font-medium text-muted/55 tabular-nums">
                          {band.minutes}m
                        </span>
                      )
                    )}
                  </div>
                );
              })}

              {/* Empty weekday state so free days / holidays read intentionally */}
              {col.events.length === 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-16 flex justify-center"
                >
                  <span className="u-schedule-glass-chip rounded-pill px-2.5 py-1 font-text text-micro font-semibold text-muted/80">
                    {t("day.empty")}
                  </span>
                </div>
              )}

              {/* Proportional lesson event blocks */}
              {col.events.map((block) => {
                const topPx = Math.round((block.startMin - bounds.startMin) * pxPerMin) + 1;
                const heightPx = Math.max(
                  28,
                  Math.round((block.endMin - block.startMin) * pxPerMin) - 2,
                );
                const isPast = col.today && now.minutes >= block.endMin && !block.live;
                return (
                  <WeekCalendarEvent
                    key={block.key}
                    block={block}
                    weekdayLabel={col.weekday}
                    topPx={topPx}
                    heightPx={heightPx}
                    density={effectiveDensity}
                    filled={filled}
                    isPast={isPast}
                    progress={block.live ? (todayProgress?.progress ?? undefined) : undefined}
                    subjectColorOverrides={subjectColorOverrides}
                    groupColorOverrides={groupColorOverrides}
                    colorCodingEnabled={colorCodingEnabled}
                    highlightCoverLessons={highlightCoverLessons}
                    onSelect={handleSelectEvent}
                  />
                );
              })}

              {/* Live `--lamp` current-time indicator line: glowing on Today, faint reference across the week */}
              {showNowLine &&
                (col.today ? (
                  <div
                    aria-hidden="true"
                    data-testid="week-now-line"
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: `${String(nowTopPx)}px` }}
                  >
                    <span
                      className="-ml-[4px] size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: "var(--lamp-mark)",
                        boxShadow: "0 0 8px 2px var(--lamp-glow)",
                      }}
                    />
                    <span
                      className="h-[1.5px] flex-1"
                      style={{
                        backgroundColor: "var(--lamp-mark)",
                        boxShadow: "0 0 6px var(--lamp-glow)",
                      }}
                    />
                  </div>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-15 h-px opacity-22"
                    style={{
                      top: `${String(nowTopPx)}px`,
                      backgroundColor: "var(--lamp-mark)",
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
