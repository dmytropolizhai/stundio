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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayProgress, type RigaClock, type WeekPeriod } from "@/lib/schedule";
import { Icon, cn } from "@/ds";
import { buildingNotice } from "@/ui/theme";
import { formatWeekdayLong, formatWeekdayShort, useLang, useT } from "@/ui/i18n";
import {
  buildDayEvents,
  computeCalendarBounds,
  dayChangeCount,
  formatMinuteLabel,
  type CalendarEventBlock,
} from "./week-calendar-layout.ts";
import { WeekCalendarEvent, type CalendarDensity } from "./week-calendar-event.tsx";

/** Pixels per minute / column width at zoom 1; the phone canvas scales both continuously. */
const BASE_PX_PER_MINUTE = 2.05;
const BASE_COL_WIDTH = 180;
/** At or below this zoom the canvas stops panning and fits Mon–Fri into the viewport. */
export const FIT_ZOOM = 0.5;
export const DEFAULT_ZOOM = 0.8;
const MAX_ZOOM = 1.5;
/** Below this zoom columns are too narrow for full cards, so they switch to compact labels. */
const COMPACT_BELOW_ZOOM = 0.7;
const FIT_PX_PER_MINUTE = 1.2;

const HEADER_HEIGHT = 54;
/** The floating action pill sits inside the header's top strip, so the row grows by its height. */
const HEADER_ROW = `calc(${String(HEADER_HEIGHT)}px + var(--week-float, 0px))`;
const headerStyle = { height: HEADER_ROW, paddingTop: "var(--week-float, 0px)" };

const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(FIT_ZOOM, z));

const touchDistance = (t: TouchList): number =>
  Math.hypot(
    (t[0]?.clientX ?? 0) - (t[1]?.clientX ?? 0),
    (t[0]?.clientY ?? 0) - (t[1]?.clientY ?? 0),
  );

type WeekCalendarProps = {
  dates: readonly ISODate[];
  days: readonly (ResolvedDay | null)[];
  periods: readonly WeekPeriod[];
  now: RigaClock;
  zoom: number;
  onZoomChange: (zoom: number) => void;
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
  zoom,
  onZoomChange,
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

  const fit = !isDesktop && zoom <= FIT_ZOOM;
  const isHorizontalPan = !isDesktop && !fit;
  const effectiveDensity: CalendarDensity =
    fit || (isHorizontalPan && zoom < COMPACT_BELOW_ZOOM) ? "overview" : "detailed";
  const pxPerMin = isDesktop
    ? BASE_PX_PER_MINUTE
    : fit
      ? FIT_PX_PER_MINUTE
      : BASE_PX_PER_MINUTE * zoom;
  const colWidth = Math.round(BASE_COL_WIDTH * zoom);
  const timeRailWidth = effectiveDensity === "detailed" ? 50 : 44;
  const bounds = useMemo(() => computeCalendarBounds(days, periods), [days, periods]);
  const canvasHeight = Math.round(bounds.totalMinutes * pxPerMin);
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
          weekdayLong: formatWeekdayLong(d, lang),
          today: d === now.date,
          lessonCount: day?.lessons.filter((l) => l.status !== "cancelled").length ?? 0,
          changeCount: dayChangeCount(day),
          buildings: day === null ? [] : (buildingNotice(day) ?? []),
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
        isHorizontalPan && todayIndex > 0 ? Math.max(0, todayIndex * colWidth - 24) : 0;

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
      colWidth,
      isHorizontalPan,
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
  }, [weekKey, fit, isDesktop]);

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

  /*
   * Two-finger pinch zooms the canvas continuously (phones/tablets). Native listeners because the
   * handler must be non-passive to stop the browser scrolling mid-pinch. The point under the
   * fingers stays put: `pinch` remembers where it was, and the layout effect below re-derives the
   * scroll offsets once the new zoom has laid out.
   */
  const pinch = useRef<{
    startZoom: number;
    startDist: number;
    scrollLeft: number;
    scrollTop: number;
    vx: number;
    vy: number;
  } | null>(null);
  const liveZoom = useRef(zoom);
  const zoomFrame = useRef(0);
  const lastRendered = useRef(zoom);
  liveZoom.current = zoom;

  useEffect(() => {
    const el = scrollRef.current;
    if (el === null || isDesktop) return;

    const onStart = (e: globalThis.TouchEvent) => {
      if (e.touches.length !== 2) return;
      const rect = el.getBoundingClientRect();
      const [a, b] = [e.touches[0], e.touches[1]];
      if (a === undefined || b === undefined) return;
      pinch.current = {
        startZoom: liveZoom.current,
        startDist: Math.max(1, touchDistance(e.touches)),
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        vx: (a.clientX + b.clientX) / 2 - rect.left,
        vy: (a.clientY + b.clientY) / 2 - rect.top,
      };
    };

    const onMove = (e: globalThis.TouchEvent) => {
      const p = pinch.current;
      if (p === null || e.touches.length !== 2) return;
      e.preventDefault();
      const next = clampZoom((p.startZoom * touchDistance(e.touches)) / p.startDist);
      cancelAnimationFrame(zoomFrame.current);
      zoomFrame.current = requestAnimationFrame(() => {
        if (next !== lastRendered.current) onZoomChange(next);
      });
    };

    const onEnd = (e: globalThis.TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      cancelAnimationFrame(zoomFrame.current);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [isDesktop, onZoomChange]);

  useLayoutEffect(() => {
    lastRendered.current = zoom;
    const p = pinch.current;
    const el = scrollRef.current;
    if (p === null || el === null || fit) return;
    const ratio = zoom / p.startZoom;
    /* Rail and header are fixed-size; only the grid area scales around the pinch centre. */
    el.scrollLeft = Math.max(
      0,
      timeRailWidth + (p.scrollLeft + p.vx - timeRailWidth) * ratio - p.vx,
    );
    el.scrollTop = Math.max(0, HEADER_HEIGHT + (p.scrollTop + p.vy - HEADER_HEIGHT) * ratio - p.vy);
    syncScrollFlags();
  }, [zoom, fit, timeRailWidth, syncScrollFlags]);

  const showNowLine =
    todayIndex !== -1 && now.minutes >= bounds.startMin && now.minutes <= bounds.endMin;
  const nowTopPx = showNowLine ? Math.round((now.minutes - bounds.startMin) * pxPerMin) : 0;

  const gridTemplateColumns = isHorizontalPan
    ? `${String(timeRailWidth)}px repeat(${String(dates.length)}, ${String(colWidth)}px)`
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
      className="u-week-canvas flex min-h-0 w-full flex-1 flex-col overflow-hidden"
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
              ? `${String(timeRailWidth + dates.length * colWidth)}px`
              : "100%",
            minHeight: "100%",
            gridTemplateRows: `${HEADER_ROW} minmax(calc(${String(canvasHeight)}px + var(--nav-safe)), 1fr)`,
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
              style={headerStyle}
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
              style={headerStyle}
            >
              <Icon name="clock" size={13} />
            </div>
          )}

          {/* Sticky weekday header cells (Mon–Fri) */}
          {dayColumns.map((col, colIdx) => (
            <button
              key={col.date}
              type="button"
              {...(col.today ? { "aria-current": "date" as const } : {})}
              aria-label={`${col.weekdayLong}: ${t("week.overview.lessons", { n: col.lessonCount })}${col.changeCount > 0 ? ` · ${t("week.overview.changes", { n: col.changeCount })}` : ""}`}
              onClick={() => {
                onOpenDay(col.date);
              }}
              style={headerStyle}
              className={cn(
                "u-week-sticky-header sticky top-0 z-20 flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 px-1.5",
                colIdx > 0 && "border-l border-hairline/55",
                "transition-colors duration-(--dur-fast) hover:bg-(--schedule-row-hover)",
                "focus-visible:z-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)",
                // Preserve `tracking-label` so assistive styling and weekday-header selectors agree.
                "tracking-label",
              )}
            >
              <span className="flex max-w-full items-baseline gap-1 leading-none">
                <span
                  className={cn(
                    "truncate font-text text-[10.5px] font-bold uppercase",
                    col.today ? "text-strong" : "text-muted",
                  )}
                >
                  {col.weekday}
                </span>
                <span
                  data-testid="week-day-count"
                  className="shrink-0 font-data text-micro font-medium text-muted/80 tabular-nums"
                >
                  {col.lessonCount}
                </span>
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
            style={{ minHeight: `calc(${String(canvasHeight)}px + var(--nav-safe))` }}
          >
            {/* One tick per period: the school's lesson number stacked over its start time, same right edge, so the two never share a row */}
            {bounds.periodTicks.map((pt) => {
              const top = Math.round((pt.minutes - bounds.startMin) * pxPerMin);
              return (
                <span
                  key={`pt-${pt.period}`}
                  className="u-data absolute right-1.5 flex flex-col items-end gap-0.5 text-micro leading-none"
                  style={{ top: `${String(top + 4)}px` }}
                >
                  <span data-testid="week-period-number" className="font-bold text-strong">
                    {pt.period}
                  </span>
                  <span aria-hidden="true" className="font-medium text-muted">
                    {pt.start}
                  </span>
                </span>
              );
            })}

            {/* Live current-time pill in `--lamp` on the sticky rail */}
            {showNowLine && (
              <span
                data-testid="week-now-pill"
                className="u-data absolute right-0.5 left-0.5 z-20 flex -translate-y-1/2 items-center justify-center rounded-pill py-0.5 text-micro leading-none font-bold shadow-card"
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
                "relative",
                colIdx > 0 && "border-l border-hairline/55",
                col.today && "u-week-today-col",
              )}
              style={{ minHeight: `calc(${String(canvasHeight)}px + var(--nav-safe))` }}
            >
              {/* Other-building flag, pinned just under the weekday header */}
              {col.buildings.length > 0 && (
                <div
                  className="pointer-events-none sticky z-20 h-0"
                  style={{ top: `calc(var(--week-float, 0px) + ${String(HEADER_HEIGHT)}px)` }}
                >
                  <span
                    data-testid="week-day-building"
                    className="u-schedule-glass-chip absolute top-1 left-1/2 inline-flex max-w-[calc(100%-8px)] -translate-x-1/2 items-center gap-1 rounded-pill px-2 py-0.5 font-text text-micro leading-none font-semibold text-strong"
                  >
                    <Icon name="building-2" size={10} className="shrink-0 text-muted" />
                    <span className="truncate">{col.buildings.join(" · ")}</span>
                  </span>
                </div>
              )}

              {/* Period-start guide lines, aligned with the numbers in the time rail */}
              {bounds.periodTicks.map((pt) => {
                const top = Math.round((pt.minutes - bounds.startMin) * pxPerMin);
                return (
                  <span
                    key={`line-p-${pt.period}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 h-px bg-hairline/45"
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
