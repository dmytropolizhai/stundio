/**
 * Recessed liquid-glass connectors rendered between separate schedule slabs:
 * - `DayGap`: a free period (>= 35 min), optionally carrying a building-walk callout when the
 *   next slab also moves to another building.
 * - `DayBuildingBridge`: a building transition between consecutive lessons with no free period.
 */
import { Icon } from "@/ds";
import { formatDuration } from "@/ui/i18n";

type DayGapProps = {
  minutes: number;
  label: string;
  /** Clock window (`10:15–11:30`); omitted visually when `walkLabel` is present so the pill fits 360 px. */
  timeRange?: string | undefined;
  walkLabel?: string | undefined;
};

export const DayGap = ({ minutes, label, timeRange, walkLabel }: DayGapProps) => {
  const duration = formatDuration(minutes);
  const ariaLabel = [label, duration, timeRange, walkLabel]
    .filter((part): part is string => part !== undefined)
    .join(" · ");

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-0.5"
      role="separator"
      aria-label={ariaLabel}
      data-testid="day-gap"
    >
      <span aria-hidden="true" className="h-px flex-1 bg-(--schedule-divider)" />
      <span className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-text text-caption text-muted">
        <span className="u-data font-medium text-strong">{duration}</span>
        {walkLabel === undefined && timeRange !== undefined && (
          <>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <span className="u-data whitespace-nowrap text-muted" data-testid="day-gap-time">
              {timeRange}
            </span>
          </>
        )}
        {walkLabel !== undefined && (
          <>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-strong">
              <Icon name="building-2" size={12} className="shrink-0" />
              {walkLabel}
            </span>
          </>
        )}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-(--schedule-divider)" />
    </div>
  );
};

type DayBuildingBridgeProps = {
  label: string;
};

export const DayBuildingBridge = ({ label }: DayBuildingBridgeProps) => (
  <div
    className="flex items-center gap-2.5 px-3 py-0.5"
    role="separator"
    data-testid="day-building-bridge"
  >
    <span aria-hidden="true" className="h-px flex-1 bg-(--schedule-divider)" />
    <span className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-text text-caption font-semibold text-strong">
      <Icon name="building-2" size={13} className="shrink-0 text-caution" />
      <span>{label}</span>
    </span>
    <span aria-hidden="true" className="h-px flex-1 bg-(--schedule-divider)" />
  </div>
);
