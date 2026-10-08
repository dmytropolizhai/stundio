import { Card, Icon } from "@/ds";
import { useT } from "@/ui/i18n";

/** A stale timetable changes how far to trust the glance, so it stays above it. */
export const DayStaleNotice = ({ stale }: { stale: boolean }) => {
  const t = useT();

  return stale ? (
    <Card tone="amber" radius="lg" className="mt-3 font-text text-caption">
      {t("day.stale")}
    </Card>
  ) : null;
};

/**
 * Offline qualifies the banner the same way staleness does — the "now" it shows may be out of
 * date — so it sits above the banner too rather than with the notes under the schedule.
 */
export const DayOfflineNotice = ({ syncStatus }: { syncStatus: string }) => {
  const t = useT();

  return syncStatus === "offline" ? (
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
  ) : null;
};

type DayStatusProps = {
  buildings: string[] | null;
  isToday: boolean;
  finished: boolean;
};

/** Footnotes to the schedule: which building the day runs in, and whether it's already over. */
export const DayStatus = ({ buildings, isToday, finished }: DayStatusProps) => {
  const t = useT();

  return (
    <>
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
