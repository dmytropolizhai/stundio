import { Card, Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type DayStatusProps = {
  syncStatus: string;
  stale: boolean;
  buildings: string[] | null;
  isToday: boolean;
  finished: boolean;
};

export const DayStatus = ({ syncStatus, stale, buildings, isToday, finished }: DayStatusProps) => {
  const t = useT();

  return (
    <>
      {syncStatus === "offline" && (
        <Card
          tone="sunken"
          radius="lg"
          elevation="none"
          className="mt-3 flex items-center gap-2 font-text text-caption text-fg"
          data-testid="offline-banner"
        >
          <Icon name="wifi-off" size={16} className="shrink-0 text-offline" />
          {t("day.offline")}
        </Card>
      )}

      {stale && (
        <Card tone="amber" radius="lg" className="mt-3 font-text text-caption">
          {t("day.stale")}
        </Card>
      )}

      {buildings !== null && (
        <Card
          tone="sunken"
          radius="lg"
          elevation="none"
          className="mt-3 flex items-center gap-2 font-text text-caption text-fg"
          data-testid="day-building"
        >
          <Icon name="building-2" size={16} className="shrink-0 text-muted" />

          {buildings.length === 1
            ? t("day.buildingOther", {
                building: buildings[0] ?? "",
              })
            : t("day.buildingMixed", {
                buildings: buildings.join(" → "),
              })}
        </Card>
      )}

      {isToday && finished && (
        <p className="mt-3 text-center font-text text-caption text-muted">{t("day.finished")}</p>
      )}
    </>
  );
};
