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
  walkLabel?: string | undefined;
};

export const DayGap = ({ minutes, label, walkLabel }: DayGapProps) => (
  <div className="flex items-center gap-2.5 px-3 py-0.5" role="separator" data-testid="day-gap">
    <span aria-hidden="true" className="h-px flex-1 bg-(--schedule-divider)" />
    <span className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-text text-caption text-muted">
      <Icon name="coffee" size={13} className="shrink-0 opacity-75" />
      <span>
        {label} · <span className="u-data font-medium text-strong">{formatDuration(minutes)}</span>
      </span>
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
