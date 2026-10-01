import { periodRuns } from "./subst-status.ts";

const PeriodCell = ({ period }: { period: number | undefined }) => (
  <span className="grid h-7 min-w-7 place-items-center bg-sunken px-1.5 font-data text-caption font-bold tabular-nums text-strong">
    {period}
  </span>
);

type PeriodRunsProps = {
  periods: readonly number[];
  /** The translated word for "period"; spoken to screen readers, not drawn. */
  label: string;
};

/**
 * The periods a substitution covers, drawn as numbered cells. Consecutive periods
 * fuse into one segmented block; a run longer than two collapses to its ends
 * joined by a rule (1 ─── 4), and a gap in the list splits it into separate blocks.
 */
export const PeriodRuns = ({ periods, label }: PeriodRunsProps) => {
  const runs = periodRuns(periods);
  if (runs.length === 0) return null;

  const spoken = runs
    .map((run) => (run.length === 1 ? `${run[0]}` : `${run[0]}–${run.at(-1)}`))
    .join(", ");

  return (
    <div className="min-w-0" data-testid="period-runs">
      <span className="sr-only">{`${label} ${spoken}`}</span>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-1.5">
        {runs.map((run) => (
          <span
            key={run[0]}
            className="inline-flex gap-px overflow-hidden rounded-xs bg-hairline shadow-hairline"
          >
            {run.length > 2 ? (
              <span className="flex items-center bg-sunken">
                <PeriodCell period={run[0]} />
                <span className="h-0.5 w-5 rounded-pill bg-muted" />
                <PeriodCell period={run.at(-1)} />
              </span>
            ) : (
              run.map((period) => <PeriodCell key={period} period={period} />)
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
