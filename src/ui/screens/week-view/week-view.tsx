import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { weekDates, weekPeriods } from "@/lib/schedule";
import type { ISODate, ResolvedDay, ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Button, WeekGrid, type WeekGridCell, type WeekGridPeriod } from "@/ds";
import { buildingNotice, lessonBuilding, subjectCode, subjectAccent } from "@/ui/theme";
import { PullToRefresh } from "@/ui/components/PullToRefresh.tsx";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { LessonSheet } from "@/ui/screens/lesson-sheet";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useWeekOverview } from "@/ui/hooks/useWeekOverview.ts";
import { useShareWeek } from "@/ui/share/useShareWeek.ts";
import { ShareLanguageDialog } from "@/ui/share/ShareLanguageDialog.tsx";
import { formatWeekdayShort, useLang, useT } from "@/ui/i18n";
import { WeekTopBar } from "./week-top-bar.tsx";
import { WeekBuildings } from "./week-buildings.tsx";
import { WeekOverview } from "./week-overview.tsx";
import { WeekSettings } from "./week-settings.tsx";

const periodNum = (p: string): number => {
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
};

type WeekViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onOpenDay: (date: ISODate) => void;
  onPickClass: () => void;
};

/**
 * The whole school week at a glance: periods down, Mon–Fri across.
 *
 * Deliberately a grid rather than a swipeable pager of day lists — the point of this screen
 * is comparing days, and the DS sizes the cells for exactly that: a fixed 3-letter subject code,
 * which is the one place in the system abbreviation is allowed.
 */
export const WeekView = ({ date, onDateChange, onOpenDay, onPickClass }: WeekViewProps) => {
  const t = useT();
  const lang = useLang();
  const now = useNow();

  const [open, setOpen] = useState<{
    lesson: ResolvedLesson;
    day: ResolvedDay;
  } | null>(null);

  const ready = useAppStore((s) => s.ready);
  const persona = useAppStore((s) => s.settings.persona);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const selectedTeacherId = useAppStore((s) => s.settings.selectedTeacherId);
  const teacherView = useAppStore((s) => s.settings.teacherView);
  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);

  const hasIdentity =
    persona === "teacher" ? selectedTeacherId !== null : selectedClassId !== null;

  // `resolvedDay` is a stable store function; these are the inputs that change its output.
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  const dates = useMemo(() => weekDates(date), [date]);

  const days = useMemo(
    () => dates.map((d) => resolvedDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [dates, resolvedDay, timetables, substitutions, selectedClassId, persona, selectedTeacherId, teacherView],
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
          const accent = subjectAccent(lesson.subject, subjectColorOverrides, colorCodingEnabled);

          const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
          const classNames = teacherLesson.classes?.map((c) => c.short || c.name).join(" + ");
          const subjectName = lesson.subject?.name ?? lesson.subject?.short ?? "";
          const displayName = classNames ? `${subjectName} (${classNames})` : subjectName;

          cells[d] = {
            short: subjectCode(lesson.subject),
            name: displayName,
            tone: accent.tone,
            cancelled: lesson.status === "cancelled",
            span: lesson.span,
            ...(building === undefined ? {} : { building }),
            ...(accent.tone === "custom"
              ? { accentColor: { fill: accent.fill, ink: accent.ink } }
              : {}),
          };
        });

        return {
          period: periodNum(period),
          start,
          end,
          cells,
        };
      }),
    [periods, days, dates, subjectColorOverrides, colorCodingEnabled],
  );

  const body = () => {
    if (!ready) {
      return <DaySkeleton rows={7} />;
    }

    if (!hasIdentity) {
      return (
        <StateMessage
          icon={persona === "teacher" ? "briefcase" : "graduation-cap"}
          title={persona === "teacher" ? t("teacher.none") : t("day.noClass")}
        />
      );
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

        <WeekBuildings buildingDays={buildingDays} />

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

        {overview !== null && <WeekOverview overview={overview} />}
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
          <WeekTopBar
            date={date}
            firstDay={firstDay}
            lastDay={lastDay}
            onDateChange={onDateChange}
            onPickClass={onPickClass}
            onRefresh={() => void refresh({ date, force: true })}
          />

          {body()}

          {ready && hasIdentity && <WeekSettings />}
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
