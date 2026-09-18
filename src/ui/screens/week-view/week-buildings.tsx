import { Card, Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type WeekBuildingsProps = {
  buildingDays: [string, string[]][];
};

export const WeekBuildings = ({ buildingDays }: WeekBuildingsProps) => {
  const t = useT();

  if (buildingDays.length === 0) return null;

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mt-4 flex flex-col gap-1 font-text text-caption text-fg"
      data-testid="week-buildings"
    >
      {buildingDays.map(([building, weekdays]) => (
        <span key={building} className="flex items-center gap-2">
          <Icon name="building-2" size={16} className="shrink-0 text-muted" />
          {t("week.buildingDays", { building, days: weekdays.join(", ") })}
        </span>
      ))}
    </Card>
  );
};
