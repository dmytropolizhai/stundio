/**
 * Continuous liquid-glass schedule slabs for the Home screen's Day block.
 *
 * Consecutive lessons in the same building share a single frosted-glass slab separated by luminous
 * hairlines and linked along the left spine by an optical thread. Free periods, building hops, and
 * the between-lessons now-marker split the schedule into separate slabs, while the currently
 * running lesson lifts out onto its own deep grainy subject-field card (matching the featured
 * `SubjectCard`, `DayGlance`, and `NowDock`).
 */
import { Fragment, useMemo, type ReactNode } from "react";
import { m, type MotionValue } from "framer-motion";
import { cn } from "@/ds";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { FREE_PERIOD_MIN_MINUTES, minutesOf, pairByGroup } from "@/lib/schedule";
import { lessonBuilding } from "@/ui/theme";
import { useT } from "@/ui/i18n";
import { DayGlassLesson } from "./day-glass-lesson.tsx";
import { DayBuildingBridge, DayGap } from "./day-gap.tsx";
import { DayNowMarker } from "./day-now-marker.tsx";

type DayLessonListProps = {
  day: ResolvedDay;
  date: ISODate;
  now: { date: ISODate; minutes: number };
  progress: { current: ResolvedLesson | null; progress: number | null };
  showTime: boolean;
  subjectColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  filled: boolean;
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  dragging: boolean;
  onOpenLesson: (lesson: ResolvedLesson) => void;
};

type PendingPaneSlot = {
  key: string;
  pair: readonly [ResolvedLesson, ResolvedLesson] | null;
  lesson: ResolvedLesson;
};

type PaneRow = { key: string; node: ReactNode };

type ScheduleSegment =
  | { kind: "pane"; key: string; rows: PaneRow[] }
  | { kind: "live"; key: string; node: ReactNode }
  | {
      kind: "gap";
      key: string;
      minutes: number;
      timeRange?: string | undefined;
      walkTo?: string | undefined;
    }
  | { kind: "bridge"; key: string; toBuilding: string }
  | { kind: "now"; key: string };

const formatTimeRange = (start: string, end: string): string =>
  [start, end].filter((part) => part !== "").join("–");

const slotBuildingName = (day: ResolvedDay, lesson: ResolvedLesson): string | undefined => {
  if (day.buildings.length <= 1) return undefined;
  return lesson.building ?? day.building ?? undefined;
};

export const DayLessonList = ({
  day,
  date,
  now,
  progress,
  showTime,
  subjectColorOverrides,
  colorCodingEnabled,
  filled,
  x,
  opacity,
  dragging,
  onOpenLesson,
}: DayLessonListProps) => {
  const t = useT();
  const isToday = date === now.date;

  const segments = useMemo(() => {
    const out: ScheduleSegment[] = [];
    let currentPane: PendingPaneSlot[] = [];
    let paneIndex = 0;

    const renderSingleRow = (
      l: ResolvedLesson,
      half: boolean,
      connectTop: boolean,
      connectBottom: boolean,
      standalone = false,
    ) => {
      const live = progress.current === l;
      const endMin = minutesOf(l.end);
      const passed = isToday && !live && endMin !== null && endMin <= now.minutes;
      const building = lessonBuilding(day, l);

      return (
        <DayGlassLesson
          key={`${l.period}-${l.subject?.id ?? "x"}-${l.group ?? ""}`}
          lesson={l}
          live={live}
          passed={passed}
          showTime={showTime}
          subjectColorOverrides={subjectColorOverrides}
          colorCodingEnabled={colorCodingEnabled}
          filled={filled}
          connectTop={connectTop}
          connectBottom={connectBottom}
          half={half}
          standalone={standalone}
          {...(live && progress.progress !== null ? { progress: progress.progress } : {})}
          {...(building === undefined ? {} : { building })}
          onOpen={onOpenLesson}
        />
      );
    };

    const flushPane = () => {
      if (currentPane.length === 0) return;
      const total = currentPane.length;
      const rows: PaneRow[] = currentPane.map((item, idx) => {
        const prev = idx > 0 ? currentPane[idx - 1] : undefined;
        const next = idx < total - 1 ? currentPane[idx + 1] : undefined;
        const prevIsSingle =
          prev !== undefined &&
          prev.pair === null &&
          prev.lesson.period !== item.lesson.period &&
          prev.lesson.status !== "cancelled" &&
          item.lesson.status !== "cancelled";
        const nextIsSingle =
          next !== undefined &&
          next.pair === null &&
          next.lesson.period !== item.lesson.period &&
          next.lesson.status !== "cancelled" &&
          item.lesson.status !== "cancelled";

        if (item.pair === null) {
          return {
            key: item.key,
            node: renderSingleRow(item.lesson, false, prevIsSingle, nextIsSingle),
          };
        }

        const pairTime = formatTimeRange(item.lesson.start, item.lesson.end);
        const pairEnd = minutesOf(item.lesson.end);
        const pairPassed = isToday && pairEnd !== null && pairEnd <= now.minutes;
        const pairCancelled =
          item.pair[0].status === "cancelled" && item.pair[1].status === "cancelled";

        return {
          key: item.key,
          node: (
            <li className="list-none">
              {showTime && pairTime !== "" && (
                <div className="flex items-center border-b border-(--schedule-divider) px-3.5 py-1.5">
                  <span
                    data-testid="lesson-pair-time"
                    className={cn(
                      "u-data text-[11.5px] leading-none whitespace-nowrap",
                      pairPassed ? "text-muted" : "font-medium text-fg",
                      pairCancelled && "line-through",
                    )}
                  >
                    {pairTime}
                  </span>
                </div>
              )}
              <div
                className="grid grid-cols-2 divide-x divide-(--schedule-divider)"
                data-testid="lesson-pair"
              >
                {renderSingleRow(item.pair[0], true, false, false)}
                {renderSingleRow(item.pair[1], true, false, false)}
              </div>
            </li>
          ),
        };
      });

      out.push({ kind: "pane", key: `pane-${String(paneIndex)}`, rows });
      paneIndex += 1;
      currentPane = [];
    };

    let markerDrawn = !isToday || progress.current !== null;
    let previousEnd: number | null = null;
    let previousEndText: string | null = null;
    let previousBuilding: string | undefined;

    pairByGroup(day.lessons).forEach((slot, index) => {
      const pair = Array.isArray(slot) ? (slot as readonly [ResolvedLesson, ResolvedLesson]) : null;
      const lesson = pair === null ? (slot as ResolvedLesson) : pair[0];
      const start = minutesOf(lesson.start);
      const currentBuilding = slotBuildingName(day, lesson);
      const buildingChanged =
        previousBuilding !== undefined &&
        currentBuilding !== undefined &&
        previousBuilding !== currentBuilding;

      const hasFreeGap =
        previousEnd !== null && start !== null && start - previousEnd >= FREE_PERIOD_MIN_MINUTES;

      if (hasFreeGap && start !== null && previousEnd !== null) {
        flushPane();
        const gapRange =
          previousEndText !== null && lesson.start !== ""
            ? `${previousEndText}–${lesson.start}`
            : undefined;
        out.push({
          kind: "gap",
          key: `gap-${String(index)}`,
          minutes: start - previousEnd,
          timeRange: gapRange,
          walkTo: buildingChanged ? currentBuilding : undefined,
        });
      } else if (buildingChanged && currentBuilding !== undefined) {
        flushPane();
        out.push({
          kind: "bridge",
          key: `bridge-${String(index)}`,
          toBuilding: currentBuilding,
        });
      }

      if (!markerDrawn && start !== null && start > now.minutes) {
        markerDrawn = true;
        flushPane();
        out.push({ kind: "now", key: "now" });
      }

      const slotKey = `${lesson.period}-${lesson.subject?.id ?? "x"}-${lesson.group ?? ""}`;
      const isLiveSlot =
        pair === null
          ? progress.current === lesson
          : progress.current === pair[0] || progress.current === pair[1];

      if (isLiveSlot) {
        flushPane();
        const liveNode: ReactNode =
          pair === null ? (
            renderSingleRow(lesson, false, false, false)
          ) : (
            <li className="grid list-none grid-cols-2 gap-2.5" data-testid="lesson-pair">
              {renderSingleRow(pair[0], true, false, false, true)}
              {renderSingleRow(pair[1], true, false, false, true)}
            </li>
          );
        out.push({ kind: "live", key: `live-${slotKey}`, node: liveNode });
      } else {
        currentPane.push({ key: slotKey, pair, lesson });
      }

      const end = minutesOf(lesson.end);
      if (end !== null) {
        previousEnd = end;
        previousEndText = lesson.end;
      }
      if (currentBuilding !== undefined) {
        previousBuilding = currentBuilding;
      }
    });

    flushPane();
    return out;
  }, [
    day,
    isToday,
    now.minutes,
    progress,
    showTime,
    subjectColorOverrides,
    colorCodingEnabled,
    filled,
    onOpenLesson,
  ]);

  return (
    <m.div
      className="mt-2.5 flex flex-col gap-2.5"
      data-testid="day-schedule-panes"
      style={{
        x,
        opacity,
        willChange: dragging ? "transform" : "auto",
      }}
    >
      {segments.map((segment) => {
        if (segment.kind === "gap") {
          return (
            <DayGap
              key={segment.key}
              minutes={segment.minutes}
              label={t("day.free")}
              timeRange={segment.timeRange}
              walkLabel={segment.walkTo}
            />
          );
        }
        if (segment.kind === "bridge") {
          return (
            <DayBuildingBridge
              key={segment.key}
              label={t("day.glance.walk", { building: segment.toBuilding })}
            />
          );
        }
        if (segment.kind === "now") {
          return <DayNowMarker key={segment.key} label={t("day.now")} />;
        }
        if (segment.kind === "live") {
          return (
            <ul key={segment.key} data-testid="schedule-live-pane" className="m-0 list-none p-0">
              {segment.node}
            </ul>
          );
        }
        return (
          <ul
            key={segment.key}
            data-testid="schedule-glass-pane"
            className="u-schedule-glass m-0 list-none divide-y divide-(--schedule-divider) overflow-hidden rounded-xl p-0"
          >
            {segment.rows.map((row) => (
              <Fragment key={row.key}>{row.node}</Fragment>
            ))}
          </ul>
        );
      })}
    </m.div>
  );
};
