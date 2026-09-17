import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import { dayProgress, minutesOf } from "@/lib/schedule";
import type { ISODate, ResolvedLesson } from "@/lib/edupage";
import { Button, Card, Icon, Switch, TopBar } from "@/ds";
import { Row, Section } from "./SettingsView.tsx";
import { LessonRow } from "../components/LessonRow.tsx";
import { buildingNotice, lessonBuilding } from "@/ui/theme";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { FeedbackPrompt } from "../components/FeedbackPrompt.tsx";
import { AndroidDownloadBanner } from "../components/AndroidDownloadBanner.tsx";
import { InAppUpdatePrompt } from "../components/InAppUpdatePrompt.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { useNow } from "../hooks/useNow.ts";
import { formatDuration, useLang, useT } from "@/ui/i18n";
import { dayTitle } from "../lib/dayTitle.ts";

// Only mounted on tap — keep Radix Dialog + Popover out of the initial bundle.
const LessonSheet = lazy(() =>
  import("./LessonSheet.tsx").then((m) => ({ default: m.LessonSheet })),
);
const DatePicker = lazy(() =>
  import("../components/DatePicker.tsx").then((m) => ({ default: m.DatePicker })),
);

const SWIPE_THRESHOLD_PX = 56;
const GAP_MIN_MINUTES = 20;

const Gap = ({ minutes, label }: { minutes: number; label: string }) => (
  <li className="flex items-center gap-3 px-2 py-1 font-text text-caption text-muted">
    <span className="h-px flex-1 bg-hairline" />
    {label} · {formatDuration(minutes)}
    <span className="h-px flex-1 bg-hairline" />
  </li>
);

const NowMarker = ({ label }: { label: string }) => (
  <li className="flex items-center gap-2 px-2" data-testid="now-marker">
    <span className="size-2 rounded-pill bg-brand" />
    <span className="h-px flex-1 bg-brand/60" />
    <span className="font-text text-micro font-bold tracking-label text-brand-strong uppercase">
      {label}
    </span>
  </li>
);

type SchoolNotesProps = {
  notes: string[];
  allNotes?: string[] | undefined;
  showAll: boolean;
  onToggleShowAll: () => void;
  onShowAll: () => void;
};

const SchoolNotes = ({
  notes,
  allNotes,
  showAll,
  onToggleShowAll,
  onShowAll,
}: SchoolNotesProps) => {
  const t = useT();
  const displayNotes = showAll ? (allNotes ?? notes) : notes;
  const hasOtherNotes = (allNotes?.length ?? 0) > notes.length;

  return (
    <>
      {displayNotes.length > 0 && (
        <Card tone="sunken" radius="lg" elevation="none" className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="u-eyebrow">
              {t("day.notes")} · {t("lesson.fromSchool")}
            </h2>
            {hasOtherNotes && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="font-text text-micro font-medium text-brand hover:underline cursor-pointer"
              >
                {showAll
                  ? t("day.onlyMyGroup")
                  : t("day.allNotes", { count: allNotes?.length ?? 0 })}
              </button>
            )}
          </div>

          <ul className="mt-1.5 flex flex-col gap-1">
            {displayNotes.map((note, index) => (
              <li key={`${index}-${note}`} className="font-text text-body text-fg">
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {notes.length === 0 && hasOtherNotes && !showAll && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onShowAll}
            className="font-text text-caption text-muted hover:text-fg hover:underline cursor-pointer"
          >
            {t("day.allNotes", { count: allNotes?.length ?? 0 })}
          </button>
        </div>
      )}
    </>
  );
};

export const DayView = ({
  date,
  onDateChange,
  onPickClass,
}: {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
}) => {
  const t = useT();
  const lang = useLang();
  const now = useNow();

  const [open, setOpen] = useState<ResolvedLesson | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [prevDate, setPrevDate] = useState(date);
  const [showAllNotes, setShowAllNotes] = useState(false);

  if (prevDate !== date) {
    setPrevDate(date);
    setShowAllNotes(false);
  }

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const showTime = useAppStore((s) => s.settings.showTime);
  const setShowTime = useAppStore((s) => s.setShowTime);
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

  const rows = useMemo(() => {
    if (day === null) return [];

    const items: { key: string; node: ReactNode }[] = [];

    let markerDrawn = date !== now.date;
    let previousEnd: number | null = null;

    day.lessons.forEach((lesson, index) => {
      const start = minutesOf(lesson.start);

      if (previousEnd !== null && start !== null && start - previousEnd >= GAP_MIN_MINUTES) {
        items.push({
          key: `gap-${String(index)}`,
          node: <Gap minutes={start - previousEnd} label={t("day.free")} />,
        });
      }

      if (!markerDrawn && start !== null && start > now.minutes) {
        markerDrawn = true;

        items.push({
          key: "now",
          node: <NowMarker label={t("day.now")} />,
        });
      }

      const live = progress.current === lesson;
      const building = lessonBuilding(day, lesson);

      items.push({
        key: `${lesson.period}-${lesson.subject?.id ?? "x"}-${lesson.group ?? ""}`,
        node: (
          <LessonRow
            lesson={lesson}
            live={live}
            showTime={showTime}
            subjectColorOverrides={subjectColorOverrides}
            colorCodingEnabled={colorCodingEnabled}
            filled={filled}
            {...(live && progress.progress !== null ? { progress: progress.progress } : {})}
            {...(building === undefined ? {} : { building })}
            onOpen={() => {
              setOpen(lesson);
            }}
          />
        ),
      });

      const end = minutesOf(lesson.end);

      if (end !== null) {
        previousEnd = end;
      }
    });

    return items;
  }, [
    day,
    date,
    now.date,
    now.minutes,
    progress,
    showTime,
    subjectColorOverrides,
    colorCodingEnabled,
    filled,
    t,
  ]);

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
        {syncStatus === "offline" && (
          <Card
            tone="sunken"
            radius="lg"
            elevation="none"
            className="mt-3 flex items-center gap-2 font-text text-caption text-fg"
            data-testid="offline-banner"
          >
            <Icon name="wifi-off" size={16} className="shrink-0 text-offline" />
            {t("day.offline")}
          </Card>
        )}

        {day.stale && (
          <Card tone="amber" radius="lg" className="mt-3 font-text text-caption">
            {t("day.stale")}
          </Card>
        )}

        {buildings !== null && (
          <Card
            tone="sunken"
            radius="lg"
            elevation="none"
            className="mt-3 flex items-center gap-2 font-text text-caption text-fg"
            data-testid="day-building"
          >
            <Icon name="building-2" size={16} className="shrink-0 text-muted" />

            {buildings.length === 1
              ? t("day.buildingOther", {
                  building: buildings[0] ?? "",
                })
              : t("day.buildingMixed", {
                  buildings: buildings.join(" → "),
                })}
          </Card>
        )}

        {isToday && progress.finished && (
          <p className="mt-3 text-center font-text text-caption text-muted">{t("day.finished")}</p>
        )}

        <motion.ul
          className="mt-3 flex flex-col gap-3"
          style={{
            x,
            willChange: "transform",
          }}
        >
          {rows.map((row) => (
            <Fragment key={row.key}>{row.node}</Fragment>
          ))}
        </motion.ul>

        <SchoolNotes
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
          <TopBar
            title={
              <Suspense fallback={<span>{dayTitle(date, now.date, t, lang)}</span>}>
                <DatePicker
                  date={date}
                  today={now.date}
                  open={calendarOpen}
                  onOpenChange={setCalendarOpen}
                  onSelect={onDateChange}
                />
              </Suspense>
            }
            actions={
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge
                  onRetry={() =>
                    void refresh({
                      date,
                      force: true,
                    })
                  }
                />
              </>
            }
          />

          {!isToday && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDateChange(now.date);
                }}
              >
                {t("day.jumpToday")}
              </Button>
            </div>
          )}

          <InAppUpdatePrompt />
          <AndroidDownloadBanner />
          <FeedbackPrompt />

          {body()}

          {ready && selectedClassId !== null && (
            <div className="mt-7">
              <Section title={t("settings.day")}>
                <Row className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-text text-body font-bold text-strong">
                      {t("settings.showTime")}
                    </p>
                    <p className="mt-0.5 font-text text-caption text-muted">
                      {t("settings.showTimeHint")}
                    </p>
                  </div>
                  <Switch
                    aria-label={t("settings.showTime")}
                    checked={showTime}
                    onChange={(checked) => {
                      void setShowTime(checked);
                    }}
                  />
                </Row>
              </Section>
            </div>
          )}
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
