/**
 * Week tab — proportional 2D liquid-glass calendar canvas.
 *
 * Replaces the fixed 3-letter period matrix with a free 2D-pannable calendar field (X across
 * Mon–Fri, Y along real wall-clock minutes) where every lesson displays its full subject name,
 * room capsule, time range, teacher/group, and live/change states. Users on phones and tablets
 * can toggle between Detailed 2D pan and 5-day Full-Week overview with one tap.
 */
import { useCallback, useMemo, useState, type TouchEvent } from "react";
import { m } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import { usePersona } from "@/ui/persona";
import { weekDates, weekPeriods } from "@/lib/schedule";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { buildingNotice } from "@/ui/theme";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { LessonSheet } from "@/ui/screens/lesson-sheet";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useSwipePager } from "@/ui/hooks/useSwipePager.ts";
import { useWeekOverview } from "@/ui/hooks/useWeekOverview.ts";
import { useShareWeek } from "@/ui/share/useShareWeek.ts";
import { ShareLanguageDialog } from "@/ui/share/ShareLanguageDialog.tsx";
import { formatWeekdayShort, useLang, useT } from "@/ui/i18n";
import { WeekTopBar } from "./week-top-bar.tsx";
import { WeekBuildings } from "./week-buildings.tsx";
import { WeekOverview } from "./week-overview.tsx";
import { WeekCalendar } from "./week-calendar.tsx";
import type { CalendarDensity } from "./week-calendar-event.tsx";

type WeekViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onOpenDay: (date: ISODate) => void;
  onPickClass: () => void;
};

export const WeekView = ({ date, onDateChange, onOpenDay, onPickClass }: WeekViewProps) => {
  const t = useT();
  const lang = useLang();
  const isDesktop = useLayout() === "desktop";
  const now = useNow();

  const [density, setDensity] = useState<CalendarDensity>("detailed");
  const [open, setOpen] = useState<{
    lesson: ResolvedLesson;
    day: ResolvedDay;
  } | null>(null);

  const ready = useAppStore((s) => s.ready);
  const { identified: hasIdentity, key: identityKey, profile } = usePersona();
  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
  const lessonCardStyle = useAppStore((s) => s.settings.lessonCardStyle);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const highlightCoverLessons = useAppStore((s) => s.settings.highlightCoverLessons);
  const refresh = useAppStore((s) => s.refresh);

  // `resolvedDay` is a stable store function; these are the inputs that change its output.
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  const dates = useMemo(() => weekDates(date), [date]);

  const pager = useSwipePager(dates[0] ?? date, (dir) => {
    onDateChange(addDays(date, dir * 7));
  });

  const days = useMemo(
    () => dates.map((d) => resolvedDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [dates, resolvedDay, timetables, substitutions, identityKey],
  );

  const periods = useMemo(() => weekPeriods(days), [days]);
  const overview = useWeekOverview(date);
  const shareWeek = useShareWeek(date);

  const buildingDays = useMemo(() => {
    const byBuilding = new Map<string, string[]>();

    days.forEach((day, i) => {
      const d = dates[i];
      if (day === null || d === undefined) return;
      for (const building of buildingNotice(day) ?? []) {
        byBuilding.set(building, [
          ...(byBuilding.get(building) ?? []),
          formatWeekdayShort(d, lang),
        ]);
      }
    });

    return [...byBuilding.entries()];
  }, [days, dates, lang]);

  const firstDay = dates[0];
  const lastDay = dates[dates.length - 1];
  const isFuture = firstDay !== undefined && firstDay > now.date;
  const hasSchedule =
    ready &&
    hasIdentity &&
    !(isFuture && days.every((d) => d === null || d.stale)) &&
    periods.length > 0;

  /*
   * When the 2D calendar canvas has real horizontal overflow (Detailed mode on phone/tablet),
   * let touch drags pan smoothly across Mon–Fri inside the canvas rather than paging weeks.
   * When zoomed out to 5-day Overview (or in environments with no overflow), swiping pages weeks.
   */
  const guardCanvasTouch = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const scroller = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-testid='week-calendar-scroll']",
    );
    if (
      scroller !== null &&
      scroller !== undefined &&
      scroller.scrollWidth > scroller.clientWidth
    ) {
      e.stopPropagation();
    }
  }, []);

  const handleSelectLesson = useCallback((lesson: ResolvedLesson, day: ResolvedDay) => {
    setOpen({ lesson, day });
  }, []);

  const body = () => {
    if (!ready) {
      return (
        <div className="mx-auto w-full max-w-screen px-gutter pt-4 pb-nav-safe">
          <DaySkeleton rows={7} />
        </div>
      );
    }

    if (!hasIdentity) {
      return (
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pb-nav-safe">
          <StateMessage icon={profile.icon} title={t(profile.noneSelected)} />
        </div>
      );
    }

    /*
     * A week that hasn't started and has no timetable of its own isn't "missing data" — the
     * school just hasn't published it. The resolver falls back to the previous timetable
     * (`stale`), and showing that as next week's grid is exactly the misleading thing to avoid.
     */
    if (isFuture && days.every((d) => d === null || d.stale)) {
      return (
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pb-nav-safe">
          <StateMessage
            icon="calendar-days"
            title={t("week.noSchedule")}
            hint={t("week.noScheduleHint")}
          />
        </div>
      );
    }

    if (periods.length === 0) {
      return (
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pb-nav-safe">
          <StateMessage icon="cloud" title={t("day.noData")} hint={t("day.noDataHint")} />
        </div>
      );
    }

    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        onTouchStart={guardCanvasTouch}
        onTouchMove={guardCanvasTouch}
        onTouchEnd={guardCanvasTouch}
      >
        <WeekCalendar
          dates={dates}
          days={days}
          periods={periods}
          now={now}
          density={density}
          isDesktop={isDesktop}
          mergeConsecutive={mergeConsecutive}
          filled={lessonCardStyle === "filled"}
          subjectColorOverrides={subjectColorOverrides}
          groupColorOverrides={groupColorOverrides}
          colorCodingEnabled={colorCodingEnabled}
          highlightCoverLessons={highlightCoverLessons}
          onOpenDay={onOpenDay}
          onSelectLesson={handleSelectLesson}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-app">
      <div className="w-full shrink-0 px-gutter pt-safe-top">
        <WeekTopBar
          date={date}
          today={now.date}
          isThisWeek={dates.includes(now.date)}
          firstDay={firstDay}
          lastDay={lastDay}
          density={density}
          onDensityChange={setDensity}
          showShare={hasSchedule}
          shareDisabled={shareWeek.disabled}
          shareWorking={shareWeek.status === "working"}
          onShare={shareWeek.share}
          onDateChange={onDateChange}
          onPickClass={onPickClass}
          onRefresh={() => void refresh({ date, scope: "week", force: true })}
        />

        {hasSchedule && <WeekBuildings buildingDays={buildingDays} />}

        {shareWeek.status === "error" && (
          <p role="status" className="py-1.5 text-center font-text text-caption text-danger">
            {t("share.error")}
          </p>
        )}
      </div>

      {hasSchedule && overview !== null && (
        <WeekOverview overview={overview} today={now.date} onOpenDay={onOpenDay} />
      )}

      <div
        className="flex min-h-0 w-full flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
        role="group"
        tabIndex={0}
        aria-label={t("week.pageHint")}
        style={{ touchAction: "pan-y" }}
        data-testid="week-pager"
        {...pager.gesture}
      >
        <m.div
          className="flex min-h-0 flex-1 flex-col"
          style={{ ...pager.slide, willChange: pager.dragging ? "transform" : "auto" }}
        >
          {body()}
        </m.div>
      </div>

      <LessonSheet
        lesson={open?.lesson ?? null}
        day={open?.day ?? null}
        onClose={() => {
          setOpen(null);
        }}
      />

      <ShareLanguageDialog
        open={shareWeek.languagePrompt.open}
        onDone={shareWeek.languagePrompt.onDone}
      />
    </div>
  );
};
