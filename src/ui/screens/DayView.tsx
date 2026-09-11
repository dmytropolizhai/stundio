import { useMemo, useState, type ReactNode } from "react";
import { useAppStore } from "../../store/index.ts";
import { addDays } from "../../sync/index.ts";
import { dayProgress, minutesOf, weekDates } from "../../lib/schedule/index.ts";
import type { ISODate, ResolvedLesson } from "../../lib/edupage/index.ts";
import { Button, Card, DayStrip, IconButton, TopBar } from "../../ds/index.ts";
import { GlanceCard } from "../components/GlanceCard.tsx";
import { LessonRow } from "../components/LessonRow.tsx";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { LessonSheet } from "./LessonSheet.tsx";
import { useNow } from "../hooks/useNow.ts";
import { useSelectedClass } from "../hooks/useClasses.ts";
import {
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatWeekdayShort,
  useLang,
  useT,
} from "../i18n/index.ts";

/** A gap worth drawing. Anything shorter is just the change-over between lessons. */
const GAP_MIN_MINUTES = 20;

const Gap = ({ minutes, label }: { minutes: number; label: string }) => (
  <li className="flex items-center gap-3 px-2 py-1 font-text text-caption text-muted">
    <span className="h-px flex-1 bg-hairline" />
    {label} · {formatDuration(minutes)}
    <span className="h-px flex-1 bg-hairline" />
  </li>
);

/*
 * Positional only: it says where in the list "now" falls, not what is on. The GlanceCard above
 * answers what, and holds the screen's one brand ring — so this marker stays in neutral ink.
 */
const NowMarker = ({ label }: { label: string }) => (
  <li className="flex items-center gap-2 px-2" data-testid="now-marker">
    <span className="size-2 rounded-pill bg-strong-border" />
    <span className="h-px flex-1 bg-hairline" />
    <span className="font-text text-micro font-bold tracking-label text-muted uppercase">
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
 * Layout note: the header scrolls with the content rather than sticking. That is a DS rule, and
 * the reason for it is the day strip — it has to stay adjacent to the list it filters.
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

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const selectedClass = useSelectedClass();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);
  // `resolvedDay` is memoised inside the store, so calling it every render — here or for the
  // whole strip below — is cheap; `WeekView` already leans on the same memo for all 7 days.
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);
  const day = resolvedDay(date);

  const progress = useMemo(() => dayProgress(day, now), [day, now]);
  const isToday = date === now.date;

  /* The strip shows the week `date` sits in; it re-renders when a chevron crosses into the next. */
  const week = useMemo(() => weekDates(date), [date]);
  const strip = useMemo(
    () =>
      week.map((d) => {
        // The dot is the DS's one change signal: mark a day with a cancellation or a
        // substitution, not the day that is already marked by the electric selected tile.
        const resolved = resolvedDay(d);
        const changed = resolved !== null && resolved.lessons.some((l) => l.status !== "normal");
        return {
          key: d,
          weekday: formatWeekdayShort(d, lang),
          date: formatDayMonth(d, lang).replace(/\.$/, ""),
          dot: changed,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [week, lang, resolvedDay, timetables, substitutions, selectedClassId],
  );

  const rows = useMemo<ReactNode[]>(() => {
    if (day === null) return [];
    const items: ReactNode[] = [];
    // The marker only belongs on the day you are actually living through.
    let markerDrawn = date !== now.date;
    let previousEnd: number | null = null;

    day.lessons.forEach((lesson, index) => {
      const start = minutesOf(lesson.start);
      const end = minutesOf(lesson.end);

      if (previousEnd !== null && start !== null && start - previousEnd >= GAP_MIN_MINUTES) {
        items.push(
          <Gap key={`gap-${String(index)}`} minutes={start - previousEnd} label={t("day.free")} />,
        );
      }

      if (!markerDrawn && start !== null && start > now.minutes) {
        markerDrawn = true;
        items.push(<NowMarker key="now" label={t("day.now")} />);
      }

      const live = progress.current === lesson;
      // A lesson already ended, today only — it stops carrying the same weight as what's ahead.
      const past = isToday && !live && end !== null && end <= now.minutes;
      items.push(
        <LessonRow
          key={`${lesson.period}-${lesson.subject?.id ?? "x"}-${lesson.group ?? ""}`}
          lesson={lesson}
          live={live}
          past={past}
          {...(live && progress.progress !== null ? { progress: progress.progress } : {})}
          onOpen={() => {
            setOpen(lesson);
          }}
        />,
      );

      if (end !== null) previousEnd = end;
    });

    return items;
  }, [day, date, isToday, now.date, now.minutes, progress, t]);

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

        <ul className="mt-3 flex flex-col gap-3">{rows}</ul>

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
        {/* 104px of bottom padding so the last card clears the floating nav. */}
        <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-[104px]">
          <TopBar
            eyebrow={selectedClass?.short ?? t("app.title")}
            title={isToday ? t("day.today") : formatLongDate(date, lang)}
            actions={
              <>
                <IconButton
                  icon="arrow-left"
                  label={t("day.prev")}
                  size="md"
                  onClick={() => {
                    onDateChange(addDays(date, -1));
                  }}
                />
                <IconButton
                  icon="arrow-right"
                  label={t("day.next")}
                  size="md"
                  onClick={() => {
                    onDateChange(addDays(date, 1));
                  }}
                />
              </>
            }
          />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SyncBadge onRetry={() => void refresh({ date, force: true })} />
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDateChange(now.date);
                }}
              >
                {t("day.jumpToday")}
              </Button>
            )}
          </div>

          {isToday && <GlanceCard day={day} now={now} />}

          <DayStrip days={strip} value={date} onChange={onDateChange} label={t("nav.week")} />

          {body()}
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
