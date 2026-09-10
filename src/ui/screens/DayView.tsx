import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../../store/index.ts";
import { addDays } from "../../sync/index.ts";
import { dayProgress, minutesOf } from "../../lib/schedule/index.ts";
import type { ISODate, ResolvedLesson } from "../../lib/edupage/index.ts";
import { LessonRow } from "../components/LessonRow.tsx";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { LessonSheet } from "./LessonSheet.tsx";
import { useNow } from "../hooks/useNow.ts";
import { formatDuration, formatLongDate, useLang, useT } from "../i18n/index.ts";

/** A gap worth drawing. Anything shorter is just the change-over between lessons. */
const GAP_MIN_MINUTES = 20;

const Gap = ({ minutes, label }: { minutes: number; label: string }) => (
  <li className="flex items-center gap-3 px-3 py-1 text-xs text-slate-400">
    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    {label} · {formatDuration(minutes)}
    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
  </li>
);

const NowMarker = ({ label }: { label: string }) => (
  <li className="flex items-center gap-2 px-3" data-testid="now-marker">
    <span className="h-2 w-2 rounded-full bg-accent-500" />
    <span className="h-px flex-1 bg-accent-500/60" />
    <span className="text-[11px] font-medium text-accent-600 dark:text-accent-400">{label}</span>
  </li>
);

/**
 * The home screen: one class, one day.
 *
 * Reads the store only — the store reads the cache and `sync/` refreshes underneath
 * (CLAUDE.md). Pull-to-refresh is the single user-initiated fetch, and even that goes
 * through `refresh({ force: true })` rather than touching the network here.
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
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);
  // `resolvedDay` is memoised inside the store, so calling it every render is cheap.
  const day = useAppStore((s) => s.resolvedDay(date));

  const progress = useMemo(() => dayProgress(day, now), [day, now]);
  const isToday = date === now.date;

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
  }, [day, date, now.date, now.minutes, progress, t]);

  const body = (): ReactNode => {
    if (!ready) return <DaySkeleton />;

    if (selectedClassId === null) {
      return (
        <StateMessage
          icon="🎒"
          title={t("day.noClass")}
          action={
            <button
              type="button"
              onClick={onPickClass}
              className="mt-2 rounded-xl bg-accent-500 px-4 py-2 font-medium text-white"
            >
              {t("settings.change")}
            </button>
          }
        />
      );
    }
    if (day === null) {
      return <StateMessage icon="📭" title={t("day.noData")} hint={t("day.noDataHint")} />;
    }
    if (day.lessons.length === 0) {
      return <StateMessage icon="🌤" title={t("day.empty")} hint={t("day.emptyHint")} />;
    }

    return (
      <>
        {day.stale && (
          <p className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {t("day.stale")}
          </p>
        )}

        {isToday && progress.finished && (
          <p className="mt-3 text-center text-xs text-slate-400">{t("day.finished")}</p>
        )}

        <ul className="flex flex-col gap-2 p-4">
          {rows.map((row) => (
            <li key={row.key} className="contents">
              {row.node}
            </li>
          ))}
        </ul>

        {day.notes.length > 0 && (
          <section className="mx-4 mb-6 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              {t("day.notes")} · {t("lesson.fromSchool")}
            </h2>
            <ul className="mt-1 flex flex-col gap-1">
              {day.notes.map((note) => (
                <li key={note} className="text-sm text-slate-700 dark:text-slate-200">
                  {note}
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-slate-200 px-4 pt-[var(--app-inset-top)] pb-2 dark:border-slate-800">
        <div className="flex items-center gap-1 pt-2">
          <button
            type="button"
            aria-label={t("day.prev")}
            onClick={() => {
              onDateChange(addDays(date, -1));
            }}
            className="px-2 py-1 text-xl text-slate-400"
          >
            ‹
          </button>

          <div className="min-w-0 flex-1 text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h1
                key={date}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="truncate font-semibold text-slate-900 first-letter:uppercase dark:text-slate-100"
              >
                {isToday ? t("day.today") : formatLongDate(date, lang)}
              </motion.h1>
            </AnimatePresence>
            <SyncBadge />
          </div>

          <button
            type="button"
            aria-label={t("day.next")}
            onClick={() => {
              onDateChange(addDays(date, 1));
            }}
            className="px-2 py-1 text-xl text-slate-400"
          >
            ›
          </button>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={() => {
              onDateChange(now.date);
            }}
            className="mx-auto mt-1 block rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {t("day.jumpToday")}
          </button>
        )}
      </header>

      <PullToRefresh
        refreshing={syncStatus === "syncing"}
        label={t("sync.pull")}
        releaseLabel={t("sync.release")}
        onRefresh={() => refresh({ date, force: true })}
      >
        {body()}
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
