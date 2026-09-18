import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import { dayProgress } from "@/lib/schedule";
import type { ISODate, ResolvedLesson } from "@/lib/edupage";
import { Button } from "@/ds";
import { buildingNotice } from "@/ui/theme";
import { PullToRefresh } from "@/ui/components/PullToRefresh.tsx";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { FeedbackPrompt } from "@/ui/components/FeedbackPrompt.tsx";
import { AndroidDownloadBanner } from "@/ui/components/AndroidDownloadBanner.tsx";
import { InAppUpdatePrompt } from "@/ui/components/InAppUpdatePrompt.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useT } from "@/ui/i18n";
import { DayTopBar } from "./day-top-bar.tsx";
import { DayStatus } from "./day-status.tsx";
import { DayLessonList } from "./day-lesson-list.tsx";
import { DaySchoolNotes } from "./day-school-notes.tsx";
import { DaySettings } from "./day-settings.tsx";

// Only mounted on tap — keep Radix Dialog + Popover out of the initial bundle.
const LessonSheet = lazy(() =>
  import("@/ui/screens/lesson-sheet").then((m) => ({ default: m.LessonSheet })),
);

const SWIPE_THRESHOLD_PX = 56;

type DayViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
};

export const DayView = ({ date, onDateChange, onPickClass }: DayViewProps) => {
  const t = useT();
  const now = useNow();

  const [open, setOpen] = useState<ResolvedLesson | null>(null);
  const [prevDate, setPrevDate] = useState(date);
  const [showAllNotes, setShowAllNotes] = useState(false);

  if (prevDate !== date) {
    setPrevDate(date);
    setShowAllNotes(false);
  }

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const showTime = useAppStore((s) => s.settings.showTime);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const filled = useAppStore((s) => s.settings.lessonCardStyle === "filled");
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);

  const day = useAppStore((s) => s.resolvedDay(date));

  const progress = useMemo(() => dayProgress(day, now), [day, now]);
  const buildings = useMemo(() => (day === null ? null : buildingNotice(day)), [day]);
  const isToday = date === now.date;

  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const x = useMotionValue(0);

  useEffect(() => {
    x.set(reduceMotion ? 0 : enterDir.current * 16);

    const controls = animate(x, 0, {
      duration: reduceMotion ? 0.001 : 0.24,
      ease: [0.2, 0.8, 0.2, 1],
    });

    return () => controls.stop();
  }, [date, reduceMotion, x]);

  const onSwipeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const onSwipeMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dy) > Math.abs(dx)) return;

    x.set(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;

    const dx = x.get();

    if (started && dx <= -SWIPE_THRESHOLD_PX) {
      enterDir.current = 1;
      x.set(0);
      onDateChange(addDays(date, 1));
      return;
    }

    if (started && dx >= SWIPE_THRESHOLD_PX) {
      enterDir.current = -1;
      x.set(0);
      onDateChange(addDays(date, -1));
      return;
    }

    animate(x, 0, {
      duration: reduceMotion ? 0.001 : 0.2,
      ease: [0.2, 0.8, 0.2, 1],
    });
  };

  const body = (): ReactNode => {
    if (!ready) {
      return <DaySkeleton />;
    }

    if (selectedClassId === null) {
      return (
        <StateMessage
          icon="graduation-cap"
          title={t("day.noClass")}
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
        <DayStatus
          syncStatus={syncStatus}
          stale={day.stale}
          buildings={buildings}
          isToday={isToday}
          finished={progress.finished}
        />

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
          onOpenLesson={setOpen}
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
        onRefresh={() => {
          void refresh({
            date,
            force: true,
          });
        }}
      >
        <div
          className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe"
          role="group"
          tabIndex={0}
          aria-label={t("day.pageHint")}
          style={{ touchAction: "pan-y" }}
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          onTouchCancel={onSwipeEnd}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              enterDir.current = 1;
              onDateChange(addDays(date, 1));
            } else if (e.key === "ArrowLeft") {
              enterDir.current = -1;
              onDateChange(addDays(date, -1));
            }
          }}
        >
          <DayTopBar
            date={date}
            today={now.date}
            isToday={isToday}
            onDateChange={onDateChange}
            onPickClass={onPickClass}
            onRefresh={() =>
              void refresh({
                date,
                force: true,
              })
            }
            onNavigate={(dir) => {
              enterDir.current = dir;
            }}
          />

          <InAppUpdatePrompt />
          <AndroidDownloadBanner />
          <FeedbackPrompt />

          {body()}

          {ready && selectedClassId !== null && <DaySettings />}
        </div>
      </PullToRefresh>

      <Suspense fallback={null}>
        <LessonSheet
          lesson={open}
          day={day}
          onClose={() => {
            setOpen(null);
          }}
        />
      </Suspense>
    </div>
  );
};
