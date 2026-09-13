import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import { weekDates, weekPeriods } from "@/lib/schedule";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import {
  Button,
  Card,
  Icon,
  IconButton,
  TopBar,
  WeekGrid,
  type WeekGridCell,
  type WeekGridPeriod,
} from "@/ds";
import { buildingNotice, lessonBuilding, subjectCode, subjectTone } from "@/ui/theme";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { LessonSheet } from "./LessonSheet.tsx";
import { useNow } from "../hooks/useNow.ts";
import { useWeekOverview } from "../hooks/useWeekOverview.ts";
import { useShareWeek } from "../share/useShareWeek.ts";
import { ShareLanguageDialog } from "../share/ShareLanguageDialog.tsx";
import { formatWeekdayLong, formatWeekdayShort, formatWeekRange, useLang, useT } from "@/ui/i18n";

const periodNum = (p: string): number => {
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The whole school week at a glance: periods down, Mon–Fri across.
 *
 * Deliberately a grid rather than a swipeable pager of day lists — the point of this screen
 * is comparing days, and the DS sizes the cells for exactly that: a fixed 3-letter subject code,
 * which is the one place in the system abbreviation is allowed.
 */
export const WeekView = ({
  date,
  onDateChange,
  onOpenDay,
  onPickClass,
}: {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onOpenDay: (date: ISODate) => void;
  onPickClass: () => void;
}) => {
  const t = useT();
  const lang = useLang();
  const now = useNow();

  const [open, setOpen] = useState<{
    lesson: ResolvedLesson;
    day: ResolvedDay;
  } | null>(null);

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
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

  const periods = useMemo(() => weekPeriods(days), [days]);
  const overview = useWeekOverview(date);
  const shareWeek = useShareWeek(date);

  const columns = useMemo(
    () =>
      dates.map((d) => ({
        key: d,
        weekday: formatWeekdayShort(d, lang),
        today: d === now.date,
      })),
    [dates, lang, now.date],
  );

  /*
   * Which days are somewhere else, grouped by building. The grid marks those cells with a
   * hairline ring, but a 40px cell cannot say *where* — and "which days do I go to the annex"
   * is the question a week view is opened with, so it gets one plain line under the grid.
   */
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

  /* The grid speaks in codes; this is what turns a tapped cell back into a real lesson. */
  const lessonAt = useMemo(() => {
    const map = new Map<string, { lesson: ResolvedLesson; day: ResolvedDay }>();

    days.forEach((day, i) => {
      const d = dates[i];

      if (day === null || d === undefined) return;

      for (const lesson of day.lessons) {
        map.set(`${d}|${lesson.period}`, { lesson, day });
      }
    });

    return map;
  }, [days, dates]);

  const rows = useMemo<WeekGridPeriod<ISODate>[]>(
    () =>
      periods.map(({ period, start, end }) => {
        const cells: Partial<Record<ISODate, WeekGridCell>> = {};

        days.forEach((day, i) => {
          const d = dates[i];

          if (day === null || d === undefined) return;

          const lesson = day.lessons.find((l) => l.period === period);

          if (lesson === undefined) return;

          const building = lessonBuilding(day, lesson);

          cells[d] = {
            short: subjectCode(lesson.subject),
            name: lesson.subject?.name ?? lesson.subject?.short ?? "",
            tone: subjectTone(lesson.subject),
            cancelled: lesson.status === "cancelled",
            ...(building === undefined ? {} : { building }),
          };
        });

        return {
          period: periodNum(period),
          start,
          end,
          cells,
        };
      }),
    [periods, days, dates],
  );

  const body = () => {
    if (!ready) {
      return <DaySkeleton rows={7} />;
    }

    if (selectedClassId === null) {
      return <StateMessage icon="graduation-cap" title={t("day.noClass")} />;
    }

    if (periods.length === 0) {
      return <StateMessage icon="cloud" title={t("day.noData")} hint={t("day.noDataHint")} />;
    }

    return (
      <>
        <WeekGrid
          className="mt-4"
          days={columns}
          periods={rows}
          cellLabel={(cell, day) =>
            `${cell.name ?? cell.short} · ${day.weekday}` +
            (cell.building !== undefined ? ` · ${cell.building}` : "")
          }
          onSelectDay={onOpenDay}
          mergeConsecutive={mergeConsecutive}
          onSelect={(_cell, dayKey, period) => {
            const hit = lessonAt.get(`${dayKey}|${String(period)}`);

            if (hit !== undefined) {
              setOpen(hit);
            }
          }}
        />

        {buildingDays.length > 0 && (
          <Card
            tone="sunken"
            radius="lg"
            elevation="none"
            className="mt-4 flex flex-col gap-1 font-text text-caption text-fg"
            data-testid="week-buildings"
          >
            {buildingDays.map(([building, weekdays]) => (
              <span key={building} className="flex items-center gap-2">
                <Icon name="building-2" size={16} className="shrink-0 text-muted" />
                {t("week.buildingDays", { building, days: weekdays.join(", ") })}
              </span>
            ))}
          </Card>
        )}

        {/*
          Under the grid rather than in the header: at 375px the header already carries the week
          range between two arrows, the class chip and the sync badge, and a fourth control there
          truncates the date range — the one thing that says which week this is. Down here it can
          also be a labelled button instead of a bare glyph.
        */}
        <Button
          icon="share-2"
          variant="outline"
          block
          className="mt-4"
          disabled={shareWeek.disabled}
          onClick={shareWeek.share}
          data-testid="share-week"
        >
          {shareWeek.status === "working" ? t("share.working") : t("share.week")}
        </Button>

        {shareWeek.status === "error" && (
          <p role="status" className="mt-2 text-center font-text text-caption text-danger">
            {t("share.error")}
          </p>
        )}

        {overview !== null && (
          <div className="mt-6">
            <h2 className="mb-3 font-display text-display-2 tracking-display text-strong">
              {t("week.overview.title")}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <div className="font-data text-display-2 font-black tabular-nums">
                  {overview.totalLessons}
                </div>

                <div className="mt-1 font-text text-caption text-muted">
                  {t("week.overview.lessons", {
                    n: overview.totalLessons,
                  })}
                </div>

                {overview.lessonDelta !== null && (
                  <div className="mt-2 font-text text-micro font-bold text-muted">
                    {overview.lessonDelta > 0
                      ? t("week.overview.lessonsUp", {
                          n: overview.lessonDelta,
                        })
                      : overview.lessonDelta < 0
                        ? t("week.overview.lessonsDown", {
                            n: overview.lessonDelta,
                          })
                        : t("week.overview.lessonsSame")}
                  </div>
                )}
              </Card>

              <Card>
                <div className="font-data text-display-2 font-black tabular-nums">
                  {overview.changedLessons}
                </div>

                <div className="mt-1 font-text text-caption text-muted">
                  {overview.changedLessons > 0
                    ? t("week.overview.changes", {
                        n: overview.changedLessons,
                      })
                    : t("week.overview.changesNone")}
                </div>
              </Card>

              {overview.busiest !== null && (
                <Card>
                  <div className="font-text text-micro font-bold tracking-label text-muted uppercase opacity-75">
                    {t("week.overview.busiestLabel")}
                  </div>

                  <div className="mt-2 font-display text-[22px] leading-none font-black text-strong">
                    {formatWeekdayLong(overview.busiest.date, lang)}
                  </div>

                  <div className="mt-1 font-text text-caption text-muted">
                    {t("week.overview.lessons", {
                      n: overview.busiest.count,
                    })}
                  </div>
                </Card>
              )}

              {overview.lightest !== null && overview.lightest.date !== overview.busiest?.date && (
                <Card>
                  <div className="font-text text-micro font-bold tracking-label text-muted uppercase opacity-75">
                    {t("week.overview.lightestLabel")}
                  </div>

                  <div className="mt-2 font-display text-[22px] leading-none font-black text-strong">
                    {formatWeekdayLong(overview.lightest.date, lang)}
                  </div>

                  <div className="mt-1 font-text text-caption text-muted">
                    {t("week.overview.lessons", {
                      n: overview.lightest.count,
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  const firstDay = dates[0];
  const lastDay = dates[dates.length - 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PullToRefresh
        refreshing={syncStatus === "syncing"}
        label={t("sync.pull")}
        releaseLabel={t("sync.release")}
        onRefresh={() => {
          void refresh({ date, force: true });
        }}
      >
        <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
          <TopBar
            title={
              <div className="flex items-center gap-0.5">
                <IconButton
                  icon="chevron-left"
                  label={t("week.previousWeek")}
                  variant="bare"
                  size="sm"
                  onClick={() => {
                    onDateChange(addDays(date, -7));
                  }}
                />

                <span className="min-w-0 flex-1 truncate text-center text-title">
                  {firstDay !== undefined && lastDay !== undefined
                    ? formatWeekRange(firstDay, lastDay, lang)
                    : t("nav.week")}
                </span>

                <IconButton
                  icon="chevron-right"
                  label={t("week.nextWeek")}
                  variant="bare"
                  size="sm"
                  onClick={() => {
                    onDateChange(addDays(date, 7));
                  }}
                />
              </div>
            }
            actions={
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge onRetry={() => void refresh({ date, force: true })} />
              </>
            }
          />

          {body()}
        </div>
      </PullToRefresh>

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
