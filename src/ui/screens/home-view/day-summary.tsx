import type { DaySummary as Summary } from "@/lib/schedule";
import { Icon, type IconName } from "@/ds";
import { formatDuration, useT } from "@/ui/i18n";

type DaySummaryProps = { summary: Summary };

type FactProps = { icon: IconName; label: string; children: string };

/** An icon and a figure; the sentence it replaces stays available to screen readers. */
const Fact = ({ icon, label, children }: FactProps) => (
  <li className="flex items-center gap-1.5" aria-label={label}>
    <Icon name={icon} size={18} className="block shrink-0 text-muted" />
    <span aria-hidden="true" className="leading-none">
      {children}
    </span>
  </li>
);

/** The day at a glance — when it runs, how many lessons, how much of it is free. */
export const DaySummary = ({ summary }: DaySummaryProps) => {
  const t = useT();
  const free = formatDuration(summary.freeMinutes);

  return (
    <ul
      className="mt-3 flex flex-wrap items-center justify-between font-data text-body font-medium tabular-nums text-strong"
      data-testid="day-summary"
    >
      <Fact icon="clock" label={`${summary.start} – ${summary.end}`}>
        {`${summary.start} – ${summary.end}`}
      </Fact>
      <div className="flex flex-row gap-4">
        <Fact
          icon="graduation-cap"
          label={t("day.summary.lessons", { count: summary.lessonCount })}
        >
          {String(summary.lessonCount)}
        </Fact>
        {summary.freeMinutes > 0 && (
          <Fact icon="coffee" label={t("day.summary.free", { duration: free })}>
            {free}
          </Fact>
        )}
      </div>
    </ul>
  );
};
