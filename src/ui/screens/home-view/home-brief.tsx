/**
 * The top of Home, about today whatever day the schedule below is showing: how much of the
 * school day is left, Riga's weather with the one piece of advice that changes what a student
 * takes out the door, and then the glance — the lesson on now or next — or, once today is done,
 * when the next school day starts.
 */
import type { ReactNode } from "react";
import type { DayBrief } from "@/lib/schedule";
import type { WeatherCondition, WeatherHint, WeatherOutlook } from "@/lib/weather";
import { Badge, Card, Icon, type IconName } from "@/ds";
import { useT, type MessageKey } from "@/ui/i18n";

const CONDITION_ICON: Record<WeatherCondition, { day: IconName; night: IconName }> = {
  clear: { day: "sun", night: "moon" },
  "partly-cloudy": { day: "cloud-sun", night: "cloud-moon" },
  cloudy: { day: "cloud", night: "cloud" },
  fog: { day: "cloud-fog", night: "cloud-fog" },
  drizzle: { day: "cloud-drizzle", night: "cloud-drizzle" },
  rain: { day: "cloud-rain", night: "cloud-rain" },
  snow: { day: "cloud-snow", night: "cloud-snow" },
  thunderstorm: { day: "cloud-lightning", night: "cloud-lightning" },
};

const HINT: Record<WeatherHint, { icon: IconName; key: MessageKey }> = {
  umbrella: { icon: "umbrella", key: "home.weather.hint.umbrella" },
  snow: { icon: "snowflake", key: "home.weather.hint.snow" },
  cold: { icon: "snowflake", key: "home.weather.hint.cold" },
};

const BriefText = ({ brief }: { brief: DayBrief }) => {
  const t = useT();
  let headline: string;
  let detail: string;
  switch (brief.kind) {
    case "ahead":
      headline = t("home.brief.ahead", { start: brief.start });
      detail = t("home.brief.aheadDetail", { count: brief.lessonCount, end: brief.end });
      break;
    case "ongoing":
      headline = t("home.brief.ongoing", { end: brief.end });
      detail = t("home.brief.ongoingDetail", { count: brief.remaining });
      break;
    case "finished":
      headline = t("home.brief.finished");
      detail = t("home.brief.finishedDetail", { end: brief.end });
      break;
    case "free":
      headline = t("home.brief.free");
      detail = t("home.brief.freeDetail");
      break;
  }

  return (
    <div className="min-w-0" data-testid="home-brief">
      <p className="font-display text-body-lg font-bold text-strong">{headline}</p>
      <p className="mt-0.5 font-text text-caption text-muted">{detail}</p>
    </div>
  );
};

const WeatherTile = ({ outlook }: { outlook: WeatherOutlook }) => {
  const t = useT();
  const icons = CONDITION_ICON[outlook.condition];
  const condition = t(`home.weather.${outlook.condition}`);

  return (
    <div
      className="flex shrink-0 flex-col items-end"
      data-testid="home-weather"
      role="group"
      aria-label={[
        t("home.weather.label", { temperature: outlook.temperature, condition }),
        outlook.max !== null && outlook.min !== null
          ? t("home.weather.range", { max: outlook.max, min: outlook.min })
          : null,
      ]
        .filter((part) => part !== null)
        .join(". ")}
    >
      <span aria-hidden="true" className="flex items-center gap-1.5 text-strong">
        <Icon name={outlook.isDay ? icons.day : icons.night} size={24} className="shrink-0" />
        <span className="font-display text-display-2 leading-none tabular-nums">
          {`${String(outlook.temperature)}°`}
        </span>
      </span>
      {outlook.max !== null && outlook.min !== null && (
        <span
          aria-hidden="true"
          className="mt-1 font-data text-caption tabular-nums text-muted"
        >{`${String(outlook.max)}° / ${String(outlook.min)}°`}</span>
      )}
    </div>
  );
};

type HomeBriefProps = {
  brief: DayBrief | null;
  weather: WeatherOutlook | null;
  /** Today's changed lessons; the schedule below carries the button to them. */
  changedCount: number;
  /** The glance card or tomorrow's preview, rendered by the screen. */
  children?: ReactNode;
};

export const HomeBrief = ({ brief, weather, changedCount, children }: HomeBriefProps) => {
  const t = useT();
  const hint = weather?.hint == null ? null : HINT[weather.hint];
  const showChanges = changedCount > 0 && brief !== null && brief.kind !== "finished";

  if (brief === null && weather === null && children === undefined) return null;

  return (
    <section aria-labelledby="home-today" className="mt-2" data-testid="home-hero">
      <h2 id="home-today" className="sr-only">
        {t("home.today")}
      </h2>

      {(brief !== null || weather !== null) && (
        <Card tone="surface" radius="xl" className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {brief === null ? <span /> : <BriefText brief={brief} />}
            {weather !== null && <WeatherTile outlook={weather} />}
          </div>

          {(hint !== null || showChanges) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hint !== null && (
                <Badge
                  tone="quiet"
                  uppercase={false}
                  className="inline-flex items-center gap-1.5 text-fg"
                  data-testid="home-weather-hint"
                >
                  <Icon name={hint.icon} size={14} className="shrink-0" />
                  {t(hint.key)}
                </Badge>
              )}
              {showChanges && (
                <Badge tone="warning" uppercase={false} data-testid="home-brief-changes">
                  {t("home.brief.changes", { count: changedCount })}
                </Badge>
              )}
            </div>
          )}
        </Card>
      )}

      {children}
    </section>
  );
};
