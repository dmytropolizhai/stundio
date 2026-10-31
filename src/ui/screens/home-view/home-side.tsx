/**
 * Home's side column, desktop layout only: what a phone user switches tabs for, set beside the
 * day instead — today's changed lessons, the week's overview, and the next school day.
 *
 * It is always about *today* and *this week*, like Home's top block, never about the day being
 * browsed: paging the day list must not make the column beside it jump. Every piece reuses the
 * component its own tab draws, so a change card or the overview looks the same in both places.
 */
import { useMemo } from "react";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import type { TomorrowPreview } from "@/lib/schedule";
import { Button } from "@/ds";
import { useT } from "@/ui/i18n";
import { useWeekOverview } from "@/ui/hooks/useWeekOverview.ts";
import { ChangesLessonCard } from "@/ui/screens/changes-view";
import { WeekOverview } from "@/ui/screens/week-view";
import { DayTomorrow } from "./day-tomorrow.tsx";

type HomeSideProps = {
  today: ResolvedDay | null;
  todayDate: ISODate;
  /** The next school day, when the top block is not already showing it. */
  tomorrow: { date: ISODate; preview: TomorrowPreview } | null;
  onOpenLesson: (lesson: ResolvedLesson) => void;
  onOpenDay: (date: ISODate) => void;
  onOpenChanges?: ((date: ISODate) => void) | undefined;
};

export const HomeSide = ({
  today,
  todayDate,
  tomorrow,
  onOpenLesson,
  onOpenDay,
  onOpenChanges,
}: HomeSideProps) => {
  const t = useT();
  const overview = useWeekOverview(todayDate);
  const changed = useMemo(
    () => today?.lessons.filter((lesson) => lesson.status !== "normal") ?? [],
    [today],
  );

  return (
    <aside
      aria-label={t("home.side.label")}
      data-testid="home-side"
      className="flex min-w-0 flex-col pt-5"
    >
      {changed.length > 0 && (
        <section aria-labelledby="home-side-changes" className="flex flex-col gap-3">
          <h2 id="home-side-changes" className="u-eyebrow">
            {t("home.side.changes")}
          </h2>
          {changed.map((lesson) => (
            <ChangesLessonCard
              key={`${lesson.period}-${lesson.subject?.id ?? "x"}`}
              lesson={lesson}
              onOpen={onOpenLesson}
            />
          ))}
          {onOpenChanges !== undefined && (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                onOpenChanges(todayDate);
              }}
            >
              {t("home.side.openChanges")}
            </Button>
          )}
        </section>
      )}

      {overview !== null && <WeekOverview overview={overview} />}

      {tomorrow !== null && (
        <div className="mt-3">
          <DayTomorrow
            date={tomorrow.date}
            preview={tomorrow.preview}
            onOpen={() => {
              onOpenDay(tomorrow.date);
            }}
          />
        </div>
      )}
    </aside>
  );
};
