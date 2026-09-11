import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "../../store/index.ts";
import { addDays } from "../../sync/index.ts";
import { dayProgress, minutesOf } from "../../lib/schedule/index.ts";
import type { ISODate, ResolvedLesson } from "../../lib/edupage/index.ts";
import {
  Button,
  Calendar,
  Card,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TopBar,
  cn,
} from "../../ds/index.ts";
import { LessonRow } from "../components/LessonRow.tsx";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { PreferenceBadge } from "../components/PreferenceBadge.tsx";
import { LessonSheet } from "./LessonSheet.tsx";
import { useNow } from "../hooks/useNow.ts";
import { formatDuration, formatLongDate, localeTag, useLang, useT } from "../i18n/index.ts";

/** How far a horizontal drag must travel before it counts as "change the day", not a scroll. */
const SWIPE_THRESHOLD_PX = 56;

/** A gap worth drawing. Anything shorter is just the change-over between lessons. */
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

/**
 * The home screen: one class, one day.
 *
 * Reads the store only — the store reads the cache and `sync/` refreshes underneath
 * (CLAUDE.md). Pull-to-refresh is the single user-initiated fetch, and even that goes
 * through `refresh({ force: true })` rather than touching the network here.
 *
 * Layout note: the header scrolls with the content rather than sticking, consistent with swipe
 * paging the whole block — header included — rather than a fixed piece above a scrolling list.
 */
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
  /* Times start hidden — the student reveals them on demand, animating in on the lesson card's
     own colour rail (LessonCard's `timeVisible`). */
  const [showTime, setShowTime] = useState(false);

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);
  // `resolvedDay` is memoised inside the store, so calling it every render is cheap.
  const day = useAppStore((s) => s.resolvedDay(date));

  const progress = useMemo(() => dayProgress(day, now), [day, now]);
  const isToday = date === now.date;

  /*
   * Swiping replaced the day strip (CLAUDE.md widget note aside, this is app-only UI). `dragX`
   * gives live finger-tracking feedback during the gesture; `enterDir` remembers which way we
   * just paged so the *next* day's content can slide in from the side it logically arrived from.
   */
  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onSwipeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDragging(true);
  };

  const onSwipeMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // A steeper vertical drag is the list scrolling — leave it alone.
    if (Math.abs(dy) > Math.abs(dx)) return;
    setDragX(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;
    setDragging(false);
    if (started) {
      if (dragX <= -SWIPE_THRESHOLD_PX) {
        enterDir.current = 1;
        onDateChange(addDays(date, 1));
      } else if (dragX >= SWIPE_THRESHOLD_PX) {
        enterDir.current = -1;
        onDateChange(addDays(date, -1));
      }
    }
    setDragX(0);
  };

  const rows = useMemo(() => {
    if (day === null) return [];
    const items: { key: string; node: ReactNode }[] = [];
    // The marker only belongs on the day you are actually living through.
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
        items.push({ key: "now", node: <NowMarker label={t("day.now")} /> });
      }

      const live = progress.current === lesson;
      items.push({
        key: `${lesson.period}-${lesson.subject?.id ?? "x"}-${lesson.group ?? ""}`,
        node: (
          <LessonRow
            lesson={lesson}
            live={live}
            showTime={showTime}
            {...(live && progress.progress !== null ? { progress: progress.progress } : {})}
            onOpen={() => {
              setOpen(lesson);
            }}
          />
        ),
      });

      const end = minutesOf(lesson.end);
      if (end !== null) previousEnd = end;
    });

    return items;
  }, [day, date, now.date, now.minutes, progress, showTime, t]);

  const body = (): ReactNode => {
    if (!ready) return <DaySkeleton />;

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
        {day.stale && (
          <Card tone="amber" radius="lg" className="mt-3 font-text text-caption">
            {t("day.stale")}
          </Card>
        )}

        {isToday && progress.finished && (
          <p className="mt-3 text-center font-text text-caption text-muted">{t("day.finished")}</p>
        )}

        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((row) => (
            <Fragment key={row.key}>{row.node}</Fragment>
          ))}
        </ul>

        {day.notes.length > 0 && (
          <Card tone="sunken" radius="lg" elevation="none" className="mt-7">
            <h2 className="u-eyebrow">
              {t("day.notes")} · {t("lesson.fromSchool")}
            </h2>
            <ul className="mt-1.5 flex flex-col gap-1">
              {day.notes.map((note) => (
                <li key={note} className="font-text text-body text-fg">
                  {note}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PullToRefresh
        refreshing={syncStatus === "syncing"}
        label={t("sync.pull")}
        releaseLabel={t("sync.release")}
        onRefresh={() => refresh({ date, force: true })}
      >
        {/*
          104px of bottom padding so the last card clears the floating nav. Swipe replaced the
          day strip: dragging left/right here pages the day, with a same-direction slide as the
          feedback that it worked. Arrow keys do the same thing for anyone who can't swipe —
          there is no visible control for either, so `aria-label` is the only place that says so.
        */}
        <motion.div
          key={date}
          role="group"
          tabIndex={0}
          aria-label={t("day.pageHint")}
          initial={{ opacity: 0, x: reduceMotion ? 0 : enterDir.current * 16 }}
          animate={{ opacity: 1, x: dragging ? dragX : 0 }}
          transition={{
            duration: dragging ? 0 : reduceMotion ? 0.001 : 0.24,
            ease: [0.2, 0.8, 0.2, 1],
          }}
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
          className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-[104px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <TopBar
            title={
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("day.openCalendar")}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md text-left active:scale-(--press-scale)"
                  >
                    <span>{isToday ? t("day.today") : formatLongDate(date, lang)}</span>
                    <Icon
                      name="chevron-down"
                      size={22}
                      className={cn(
                        "text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard)",
                        calendarOpen && "rotate-180",
                      )}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    value={date}
                    today={now.date}
                    locale={localeTag(lang)}
                    prevMonthLabel={t("day.previousMonth")}
                    nextMonthLabel={t("day.nextMonth")}
                    onSelect={(picked) => {
                      onDateChange(picked);
                      setCalendarOpen(false);
                    }}
                  />
                  <div className="mt-2 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="calendar-jump-today"
                      onClick={() => {
                        onDateChange(now.date);
                        setCalendarOpen(false);
                      }}
                    >
                      {t("day.jumpToday")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            }
            actions={
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge onRetry={() => void refresh({ date, force: true })} />
                <PreferenceBadge showTime={showTime} onShowTimeChange={setShowTime} />
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

          {body()}
        </motion.div>
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
