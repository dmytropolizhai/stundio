/**
 * The Home tab — the app's landing screen, in two blocks.
 *
 * Top: about *today*, whatever day is browsed below — a greeting, the day in a sentence, Riga's
 * weather with its one piece of advice, and the glance that answers "what's on now / next" (or
 * tomorrow's start once today is done). Notices that qualify everything (offline) and app-level
 * prompts sit above it.
 *
 * Bottom: the day browser — which day, the arrows, calendar and swipe paging that change it, the
 * day's outline and its full lesson list, then its footnotes (building, "lessons are over",
 * school notes). Paging moves only this block; the brief above stays on today.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/store";
import { usePersona } from "@/ui/persona";
import { stepSchoolDay } from "@/sync";
import {
  dayBrief,
  dayGlance,
  dayProgress,
  daySummary,
  minutesOf,
  tomorrowPreview,
} from "@/lib/schedule";
import { weatherOutlook } from "@/lib/weather";
import type { ISODate, ResolvedLesson } from "@/lib/edupage";
import { Button } from "@/ds";
import { buildingNotice } from "@/ui/theme";
import { PullToRefresh } from "@/ui/components/PullToRefresh.tsx";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { FeedbackPrompt } from "@/ui/components/FeedbackPrompt.tsx";
import { AndroidDownloadBanner } from "@/ui/components/AndroidDownloadBanner.tsx";
import { NotificationBlockedNotice } from "@/ui/components/NotificationBlockedNotice.tsx";
import { InAppUpdatePrompt } from "@/ui/components/InAppUpdatePrompt.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useT } from "@/ui/i18n";
import { HomeTopBar } from "./home-top-bar.tsx";
import { HomeBrief } from "./home-brief.tsx";
import { DayHeader } from "./day-header.tsx";
import { DayOfflineNotice, DayStaleNotice, DayStatus } from "./day-status.tsx";
import { DayGlance } from "./day-glance.tsx";
import { glanceWalk } from "./glance-walk.ts";
import { DaySummary } from "./day-summary.tsx";
import { DayTomorrow } from "./day-tomorrow.tsx";
import { DayLessonList } from "./day-lesson-list.tsx";
import { DaySchoolNotes } from "./day-school-notes.tsx";
import { LessonSheet } from "@/ui/screens/lesson-sheet";

const SWIPE_THRESHOLD_PX = 56;
/** Touches starting this close to a screen edge belong to the OS back gesture, not to paging. */
const EDGE_GUARD_PX = 24;

type HomeViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
  onOpenChanges?: ((date: ISODate) => void) | undefined;
};

export const HomeView = ({ date, onDateChange, onPickClass, onOpenChanges }: HomeViewProps) => {
  const t = useT();
  const now = useNow();

  const [open, setOpen] = useState<ResolvedLesson | null>(null);
  const [prevDate, setPrevDate] = useState(date);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [dragging, setDragging] = useState(false);

  if (prevDate !== date) {
    setPrevDate(date);
    setShowAllNotes(false);
  }

  const ready = useAppStore((s) => s.ready);
  const { identified: hasIdentity, profile } = usePersona();
  const showTime = useAppStore((s) => s.settings.showTime);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const filled = useAppStore((s) => s.settings.lessonCardStyle === "filled");
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);

  const day = useAppStore((s) => s.resolvedDay(date));
  const progress = useMemo(() => dayProgress(day, now), [day, now]);
  const summary = useMemo(() => daySummary(day), [day]);
  const changedLessonsCount = useMemo(
    () => day?.lessons.filter((l) => l.status !== "normal").length ?? 0,
    [day],
  );
  const buildings = useMemo(() => (day === null ? null : buildingNotice(day)), [day]);
  const isToday = date === now.date;

  // The brief is about today, not about the day being browsed.
  const today = useAppStore((s) => s.resolvedDay(now.date));
  const glance = useMemo(() => dayGlance(today, now), [today, now]);
  const brief = useMemo(() => dayBrief(today, now), [today, now]);
  const todayChanges = useMemo(
    () => today?.lessons.filter((l) => l.status !== "normal").length ?? 0,
    [today],
  );
  const nextDate = stepSchoolDay(now.date, 1);
  const nextDay = useAppStore((s) => s.resolvedDay(nextDate));
  const tomorrow = useMemo(() => tomorrowPreview(nextDay), [nextDay]);
  const forecast = useAppStore((s) => (s.settings.weatherEnabled ? s.weather : null));
  const weather = useMemo(() => {
    const outline = daySummary(today);
    const start = outline === null ? null : minutesOf(outline.start);
    const end = outline === null ? null : minutesOf(outline.end);
    return weatherOutlook(forecast, now, start === null || end === null ? null : { start, end });
  }, [forecast, today, now]);
  /* A walk the glance already announces is not repeated under the schedule — but only on the
     day the glance is about. */
  const walkAnnounced =
    isToday && glance !== null && glance.kind !== "finished" && glanceWalk(glance) !== null;

  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);

  useEffect(() => {
    /* Reduced motion keeps the day change legible as a brief cross-fade instead of a slide. */
    x.set(reduceMotion ? 0 : enterDir.current * 16);
    opacity.set(reduceMotion ? 0.35 : 1);

    const controls = [
      animate(x, 0, { duration: reduceMotion ? 0.001 : 0.24, ease: [0.2, 0.8, 0.2, 1] }),
      animate(opacity, 1, { duration: reduceMotion ? 0.18 : 0.001, ease: [0.2, 0.8, 0.2, 1] }),
    ];

    return () => {
      controls.forEach((c) => {
        c.stop();
      });
    };
  }, [date, reduceMotion, x, opacity]);

  const onSwipeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;

    const nearEdge =
      touch.clientX < EDGE_GUARD_PX || touch.clientX > window.innerWidth - EDGE_GUARD_PX;

    touchStart.current = nearEdge ? null : { x: touch.clientX, y: touch.clientY, axis: null };
  };

  const onSwipeMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    /* The first meaningful movement decides the gesture; a vertical scroll never turns into a swipe. */
    if (start.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      start.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      if (start.axis === "x") setDragging(true);
    }

    if (start.axis !== "x") return;

    x.set(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current?.axis === "x";
    touchStart.current = null;
    setDragging(false);

    const dx = started ? x.get() : 0;

    if (started && dx <= -SWIPE_THRESHOLD_PX) {
      enterDir.current = 1;
      x.set(0);
      onDateChange(stepSchoolDay(date, 1));
      return;
    }

    if (started && dx >= SWIPE_THRESHOLD_PX) {
      enterDir.current = -1;
      x.set(0);
      onDateChange(stepSchoolDay(date, -1));
      return;
    }

    animate(x, 0, {
      duration: reduceMotion ? 0.001 : 0.2,
      ease: [0.2, 0.8, 0.2, 1],
    });
  };

  const refreshDay = () =>
    void refresh({
      date,
      scope: "day",
      force: true,
    });

  const pageTo = (dir: 1 | -1) => {
    enterDir.current = dir;
    onDateChange(stepSchoolDay(date, dir));
  };

  const top = (): ReactNode => {
    if (!ready || !hasIdentity) return null;
    return (
      <HomeBrief brief={brief} weather={weather} changedCount={todayChanges}>
        {glance !== null && glance.kind !== "finished" && today !== null && (
          <DayGlance day={today} glance={glance} onOpenLesson={setOpen} />
        )}

        {glance?.kind === "finished" && tomorrow !== null && (
          <DayTomorrow
            date={nextDate}
            preview={tomorrow}
            onOpen={() => {
              enterDir.current = 1;
              onDateChange(nextDate);
            }}
          />
        )}
      </HomeBrief>
    );
  };

  const schedule = (): ReactNode => {
    if (!ready) {
      return <DaySkeleton />;
    }

    if (!hasIdentity) {
      return (
        <StateMessage
          icon={profile.icon}
          title={t(profile.noneSelected)}
          action={<Button onClick={onPickClass}>{t("settings.change")}</Button>}
        />
      );
    }

    if (day === null) {
      return <StateMessage icon="cloud" title={t("day.noData")} hint={t("day.noDataHint")} />;
    }

    if (day.lessons.length === 0) {
      return <StateMessage icon="coffee" title={t("day.empty")} hint={t("day.emptyHint")} />;
    }

    return (
      <>
        <DayStaleNotice stale={day.stale} />

        {summary !== null && <DaySummary summary={summary} />}

        <DayLessonList
          day={day}
          date={date}
          now={now}
          progress={progress}
          showTime={showTime}
          subjectColorOverrides={subjectColorOverrides}
          colorCodingEnabled={colorCodingEnabled}
          filled={filled}
          x={x}
          opacity={opacity}
          dragging={dragging}
          onOpenLesson={setOpen}
        />

        <DayStatus
          buildings={walkAnnounced ? null : buildings}
          isToday={isToday}
          finished={progress.finished}
        />

        <DaySchoolNotes
          notes={day.notes}
          allNotes={day.allNotes}
          showAll={showAllNotes}
          onToggleShowAll={() => setShowAllNotes((v) => !v)}
          onShowAll={() => setShowAllNotes(true)}
        />
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PullToRefresh
        refreshing={syncStatus === "syncing"}
        label={t("sync.pull")}
        releaseLabel={t("sync.release")}
        onRefresh={refreshDay}
      >
        <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
          <HomeTopBar nowMinutes={now.minutes} onPickClass={onPickClass} onRefresh={refreshDay} />

          <InAppUpdatePrompt />
          <AndroidDownloadBanner />
          <FeedbackPrompt />
          <NotificationBlockedNotice />

          {ready && hasIdentity && <DayOfflineNotice syncStatus={syncStatus} />}

          {top()}

          <section aria-labelledby="home-schedule" className="mt-7" data-testid="home-schedule">
            <h2 id="home-schedule" className="u-eyebrow">
              {t("home.schedule")}
            </h2>

            <div
              className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              role="group"
              tabIndex={0}
              aria-label={t("day.pageHint")}
              style={{ touchAction: "pan-y" }}
              onTouchStart={onSwipeStart}
              onTouchMove={onSwipeMove}
              onTouchEnd={onSwipeEnd}
              onTouchCancel={onSwipeEnd}
              onKeyDown={(e) => {
                /* Arrow keys inside a child control (date picker, buttons) belong to that control. */
                if (e.target !== e.currentTarget) return;
                if (e.key === "ArrowRight") pageTo(1);
                else if (e.key === "ArrowLeft") pageTo(-1);
              }}
            >
              <DayHeader
                date={date}
                today={now.date}
                isToday={isToday}
                changedLessonsCount={changedLessonsCount}
                onOpenChanges={onOpenChanges}
                onDateChange={onDateChange}
                onNavigate={(dir) => {
                  enterDir.current = dir;
                }}
              />

              {schedule()}
            </div>
          </section>
        </div>
      </PullToRefresh>

      <LessonSheet
        lesson={open}
        day={day}
        onClose={() => {
          setOpen(null);
        }}
      />
    </div>
  );
};
