import type { DaySummary as Summary } from "@/lib/schedule";
import { formatDuration, useT } from "@/ui/i18n";

type DaySummaryProps = { summary: Summary };

/** The day in one line — when it starts, when it ends, how much of it is free. */
export const DaySummary = ({ summary }: DaySummaryProps) => {
  const t = useT();

  return (
    <p
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-text text-caption text-muted"
      data-testid="day-summary"
    >
      <span className="font-data font-bold tabular-nums text-strong">
        {summary.start} – {summary.end}
      </span>
      <span>{t("day.summary.lessons", { count: summary.lessonCount })}</span>
      {summary.freeMinutes > 0 && (
        <span>{t("day.summary.free", { duration: formatDuration(summary.freeMinutes) })}</span>
      )}
    </p>
  );
};
