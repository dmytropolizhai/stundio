/**
 * Week tab — proportional 2D liquid-glass calendar canvas.
 *
 * Replaces the fixed 3-letter period matrix with a free 2D-pannable calendar field (X across
 * Mon–Fri, Y along real wall-clock minutes) where every lesson displays its full subject name,
 * room capsule, time range, teacher/group, and live/change states. Users on phones and tablets
 * can toggle between Detailed 2D pan and 5-day Full-Week overview with one tap.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import { m } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import { usePersona } from "@/ui/persona";
import { weekDates, weekPeriods } from "@/lib/schedule";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { LessonSheet } from "@/ui/screens/lesson-sheet";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useSwipePager } from "@/ui/hooks/useSwipePager.ts";
import { useShareWeek } from "@/ui/share/useShareWeek.ts";
import { ShareLanguageDialog } from "@/ui/share/ShareLanguageDialog.tsx";
import { useT } from "@/ui/i18n";
import { WeekTeacherSegment, WeekTopBar } from "./week-top-bar.tsx";
import { WeekCalendar } from "./week-calendar.tsx";
import { DEFAULT_ZOOM, FIT_ZOOM } from "./week-calendar.tsx";

type WeekViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onOpenDay: (date: ISODate) => void;
  onPickClass: () => void;
};

export const WeekView = ({ date, onDateChange, onOpenDay, onPickClass }: WeekViewProps) => {
  const t = useT();
  const layout = useLayout();
  const isDesktop = layout === "desktop";
  const isPhone = layout === "phone";
  const now = useNow();

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
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

  // `resolvedDay` is a stable store function; these are the inputs that change its output.
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  /* The header floats over the canvas; its measured height is the canvas's top inset. */
  const floatRef = useRef<HTMLDivElement | null>(null);
  const [floatHeight, setFloatHeight] = useState(76);
  useEffect(() => {
    const el = floatRef.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setFloatHeight(Math.ceil(el.getBoundingClientRect().height));
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

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
  const shareWeek = useShareWeek(date);

  const firstDay = dates[0];
  const isFuture = firstDay !== undefined && firstDay > now.date;
  const hasSchedule =
    ready &&
    hasIdentity &&
    !(isFuture && days.every((d) => d === null || d.stale)) &&
    periods.length > 0;

  /*
   * Detailed mode on a phone pans the canvas sideways, so touches inside it normally belong to the
   * canvas. The exception is a drag that *starts* with the canvas already at its left/right edge
   * and pulls further past it: nothing is left to pan, so it pages the week instead. Touch start
   * and end always reach the pager; only mid-gesture moves are withheld.
   */
  const canvasEdge = useRef<{ x: number; left: boolean; right: boolean } | null>(null);

  const scrollerOf = (e: TouchEvent<HTMLDivElement>): HTMLElement | null =>
    (e.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-testid='week-calendar-scroll']",
    ) ?? null;

  const trackCanvasTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const scroller = scrollerOf(e);
    const touch = e.touches[0];
    if (e.touches.length > 1) {
      canvasEdge.current = null;
      return;
    }
    if (scroller === null || touch === undefined || scroller.scrollWidth <= scroller.clientWidth) {
      canvasEdge.current = null;
      return;
    }
    canvasEdge.current = {
      x: touch.clientX,
      left: scroller.scrollLeft <= 1,
      right: scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1,
    };
  }, []);

  const guardCanvasMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const edge = canvasEdge.current;
    const touch = e.touches[0];
    /* Two fingers is a pinch-zoom of the canvas, never a week swipe. */
    if (e.touches.length > 1) {
      e.stopPropagation();
      return;
    }
    if (edge === null || touch === undefined) return;
    const dx = touch.clientX - edge.x;
    const pagesOut = (dx > 0 && edge.left) || (dx < 0 && edge.right);
    if (!pagesOut) e.stopPropagation();
  }, []);

  const handleSelectLesson = useCallback((lesson: ResolvedLesson, day: ResolvedDay) => {
    setOpen({ lesson, day });
  }, []);

  const body = () => {
    if (!ready) {
      return (
        <div className="mx-auto w-full max-w-screen px-gutter pt-(--week-float) pb-nav-safe">
          <DaySkeleton rows={7} />
        </div>
      );
    }

    if (!hasIdentity) {
      return (
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pt-(--week-float) pb-nav-safe">
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
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pt-(--week-float) pb-nav-safe">
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
        <div className="mx-auto flex w-full max-w-screen flex-1 items-center justify-center px-gutter pt-(--week-float) pb-nav-safe">
          <StateMessage icon="cloud" title={t("day.noData")} hint={t("day.noDataHint")} />
        </div>
      );
    }

    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        onTouchStart={trackCanvasTouchStart}
        onTouchMove={guardCanvasMove}
      >
        <WeekCalendar
          dates={dates}
          days={days}
          periods={periods}
          now={now}
          zoom={zoom}
          onZoomChange={setZoom}
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

  const actions = (
    <WeekTopBar
      date={date}
      onDateChange={onDateChange}
      fitted={zoom <= FIT_ZOOM}
      onToggleFit={() => {
        setZoom((z) => (z <= FIT_ZOOM ? DEFAULT_ZOOM : FIT_ZOOM));
      }}
      showShare={hasSchedule}
      shareDisabled={shareWeek.disabled}
      shareWorking={shareWeek.status === "working"}
      onShare={shareWeek.share}
      onPickClass={onPickClass}
    />
  );

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-app"
      style={{ "--week-float": `${String(floatHeight)}px` } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between">
        <div
          ref={floatRef}
          className="px-gutter pt-[calc(var(--app-inset-top)+0.5rem)] pb-2"
          data-testid="week-float"
        >
          {!isPhone && actions}
          <WeekTeacherSegment />

          {shareWeek.status === "error" && (
            <p role="status" className="py-1.5 text-center font-text text-caption text-danger">
              {t("share.error")}
            </p>
          )}
        </div>

        {/* Phone: the action pill rides just above the week dock, beside the week switcher. */}
        {isPhone && <div className="px-gutter pb-[calc(var(--nav-safe)+0.25rem)]">{actions}</div>}
      </div>

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
