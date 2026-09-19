import { Card } from "@/ds";
import type { useWeekOverview } from "@/ui/hooks/useWeekOverview.ts";
import { formatWeekdayLong, useLang, useT } from "@/ui/i18n";

type WeekOverviewProps = {
  overview: NonNullable<ReturnType<typeof useWeekOverview>>;
};

export const WeekOverview = ({ overview }: WeekOverviewProps) => {
  const t = useT();
  const lang = useLang();

  return (
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
  );
};
