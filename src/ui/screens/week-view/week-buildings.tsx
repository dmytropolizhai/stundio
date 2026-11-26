/**
 * Compact horizontal strip of liquid-glass building chips above the Week Calendar canvas.
 * Answers "which days do I go to the annex?" in one glance without taking vertical canvas space.
 */
import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type WeekBuildingsProps = {
  buildingDays: [string, string[]][];
};

export const WeekBuildings = ({ buildingDays }: WeekBuildingsProps) => {
  const t = useT();

  if (buildingDays.length === 0) return null;

  return (
    <div
      className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2"
      data-testid="week-buildings"
    >
      {buildingDays.map(([building, weekdays]) => (
        <span
          key={building}
          className="u-schedule-glass-chip inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1 font-text text-caption font-semibold text-fg"
        >
          <Icon name="building-2" size={13} className="shrink-0 text-muted" />
          <span>{t("week.buildingDays", { building, days: weekdays.join(", ") })}</span>
        </span>
      ))}
    </div>
  );
};
