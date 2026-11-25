/**
 * Quantitative day outline: lesson count and longest single break.
 *
 * `DaySummary` renders the ultra-compact figures inside `DayHeader`'s tappable glass horizon
 * capsule; `DaySummaryDetails` unfolds inline beneath the horizon bar on tap to show labelled
 * metrics — total lessons with the day's span, and the longest break with its exact time window.
 */
import type { DaySummary as Summary } from "@/lib/schedule";
import { cn } from "@/ds";
import { formatDuration, useT } from "@/ui/i18n";

type DaySummaryProps = {
  summary: Summary;
  /** True when embedded inside `DayHeader`'s outer glass horizon capsule. */
  bare?: boolean;
};

export const DaySummary = ({ summary, bare = false }: DaySummaryProps) => {
  const longest = summary.longestBreak;

  return (
    <span
      className={cn(
        "inline-flex items-center font-data font-medium tabular-nums text-strong",
        bare
          ? "gap-1.5 text-[12px] tracking-[-0.02em]"
          : "u-schedule-glass-chip mt-3 flex-wrap gap-2.5 rounded-pill px-3.5 py-1.5 text-caption",
      )}
      data-testid="day-summary"
    >
      <span className="shrink-0 leading-none whitespace-nowrap">{String(summary.lessonCount)}</span>
      {longest !== null && (
        <>
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span className="shrink-0 leading-none whitespace-nowrap">
            {formatDuration(longest.minutes)}
          </span>
        </>
      )}
    </span>
  );
};

type DaySummaryDetailsProps = {
  id: string;
  summary: Summary;
  expanded: boolean;
};

export const DaySummaryDetails = ({ id, summary, expanded }: DaySummaryDetailsProps) => {
  const t = useT();
  const longest = summary.longestBreak;

  return (
    <div
      id={id}
      aria-hidden={!expanded}
      inert={!expanded}
      className={cn(
        "grid transition-[grid-template-rows,margin,opacity] duration-(--dur-base) ease-(--ease-standard)",
        expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div
          data-testid="day-summary-details"
          className={cn(
            "u-schedule-glass rounded-xl transition-transform duration-(--dur-base) ease-(--ease-standard)",
            expanded ? "translate-y-0" : "-translate-y-1",
          )}
        >
          {longest !== null ? (
            <div className="grid grid-cols-2 divide-x divide-(--schedule-divider)">
              <div className="min-w-0 px-3.5 py-3">
                <div className="truncate font-text text-[12px] font-medium leading-tight text-muted">
                  {t("day.summary.lessonsLabel")}
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-data text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-strong">
                    {String(summary.lessonCount)}
                  </span>
                  <span className="font-data text-[11px] font-medium leading-none tabular-nums text-muted">
                    {`${summary.start} – ${summary.end}`}
                  </span>
                </div>
              </div>

              <div className="min-w-0 px-3.5 py-3">
                <div className="truncate font-text text-[12px] font-medium leading-tight text-muted">
                  {t("day.summary.longestBreakLabel")}
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-data text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-strong">
                    {formatDuration(longest.minutes)}
                  </span>
                  <span className="font-data text-[11px] font-medium leading-none tabular-nums text-muted">
                    {`${longest.start} – ${longest.end}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="inline-flex items-baseline gap-2">
                <span className="font-text text-caption font-medium text-muted">
                  {t("day.summary.lessonsLabel")}
                </span>
                <span className="font-data text-[16px] font-semibold leading-none tabular-nums text-strong">
                  {String(summary.lessonCount)}
                </span>
              </span>
              <span className="font-data text-[12px] font-medium leading-none tabular-nums text-muted">
                {`${summary.start} – ${summary.end}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
