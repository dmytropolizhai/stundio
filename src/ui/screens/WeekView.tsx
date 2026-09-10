import { useMemo, useState } from "react";
import { useAppStore } from "../../store/index.ts";
import { weekDates } from "../../lib/schedule/index.ts";
import type { ISODate, ResolvedDay, ResolvedLesson } from "../../lib/edupage/index.ts";
import { STATUS_DOT, isChanged, subjectColor } from "../theme/index.ts";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { LessonSheet } from "./LessonSheet.tsx";
import { useNow } from "../hooks/useNow.ts";
import { formatDayMonth, formatWeekdayShort, useLang, useT } from "../i18n/index.ts";

const periodNum = (p: string): number => {
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
};

/** The period rows the week actually uses — an empty row 0 or row 12 is wasted screen. */
const usedPeriods = (days: (ResolvedDay | null)[]): string[] => {
  const seen = new Set<string>();
  for (const day of days) for (const lesson of day?.lessons ?? []) seen.add(lesson.period);
  return [...seen].sort((a, b) => periodNum(a) - periodNum(b));
};

const Cell = ({
  lesson,
  onOpen,
}: {
  lesson: ResolvedLesson | undefined;
  onOpen: (lesson: ResolvedLesson) => void;
}) => {
  if (lesson === undefined) {
    return <div className="h-12 rounded-lg bg-slate-50 dark:bg-slate-900/40" />;
  }
  const cancelled = lesson.status === "cancelled";
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(lesson);
      }}
      className="relative flex h-12 w-full flex-col justify-center overflow-hidden rounded-lg border border-slate-200 bg-white px-1.5 text-left dark:border-slate-800 dark:bg-slate-900"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ backgroundColor: subjectColor(lesson.subject) }}
      />
      <span
        className={`truncate text-[11px] leading-tight font-medium ${
          cancelled
            ? "text-slate-400 line-through dark:text-slate-500"
            : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {lesson.subject?.short ?? "—"}
      </span>
      <span className="truncate text-[10px] leading-tight text-slate-500 dark:text-slate-400">
        {lesson.rooms.map((r) => r.short).join(", ")}
      </span>
      {isChanged(lesson.status) && (
        <span
          aria-hidden="true"
          className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT[lesson.status]}`}
        />
      )}
    </button>
  );
};

/**
 * The whole school week at a glance: periods down, Mon–Fri across.
 *
 * Deliberately a grid rather than a swipeable pager of day lists — the point of this screen
 * is comparing days, and five columns fit a phone at 11px if the cells stay to two lines.
 */
export const WeekView = ({
  date,
  onOpenDay,
}: {
  date: ISODate;
  onOpenDay: (date: ISODate) => void;
}) => {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const [open, setOpen] = useState<{ lesson: ResolvedLesson; day: ResolvedDay } | null>(null);

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);

  // `resolvedDay` is a stable store function; these are the inputs that change its output.
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  const dates = useMemo(() => weekDates(date), [date]);
  const days = useMemo(
    () => dates.map((d) => resolvedDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [dates, resolvedDay, timetables, substitutions, selectedClassId],
  );
  const periods = useMemo(() => usedPeriods(days), [days]);

  const body = () => {
    if (!ready) return <DaySkeleton rows={7} />;
    if (selectedClassId === null) {
      return <StateMessage icon="🎒" title={t("day.noClass")} />;
    }
    if (periods.length === 0) {
      return <StateMessage icon="📭" title={t("day.noData")} hint={t("day.noDataHint")} />;
    }

    return (
      <div className="p-3">
        <div className="grid grid-cols-[1.5rem_repeat(5,1fr)] gap-1">
          <span />
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                onOpenDay(d);
              }}
              className={`rounded-lg py-1 text-center text-[11px] leading-tight ${
                d === now.date
                  ? "bg-accent-50 font-semibold text-accent-600 dark:bg-accent-500/10 dark:text-accent-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <span className="block first-letter:uppercase">{formatWeekdayShort(d, lang)}</span>
              <span className="block text-[10px] opacity-70">{formatDayMonth(d, lang)}</span>
            </button>
          ))}

          {periods.map((period) => (
            <div key={period} className="contents">
              <span className="self-center text-center text-[10px] tabular-nums text-slate-400">
                {period}
              </span>
              {days.map((day, i) => (
                <Cell
                  key={`${period}-${dates[i] ?? String(i)}`}
                  lesson={day?.lessons.find((l) => l.period === period)}
                  onOpen={(lesson) => {
                    if (day !== null) setOpen({ lesson, day });
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-slate-200 px-4 pt-[var(--app-inset-top)] pb-2 text-center dark:border-slate-800">
        <h1 className="pt-2 font-semibold text-slate-900 dark:text-slate-100">{t("nav.week")}</h1>
        <SyncBadge />
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
        lesson={open?.lesson ?? null}
        day={open?.day ?? null}
        onClose={() => {
          setOpen(null);
        }}
      />
    </div>
  );
};
