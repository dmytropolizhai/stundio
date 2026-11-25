/**
 * The Home header's weather tile: only the temperature with a degree sign over an animated
 * `WeatherBackdrop` sky at rest; tapping expands it horizontally across the grid to reveal
 * the current condition and day/night temperatures, collapsing on a second tap, outside tap,
 * Escape, or after 6 s of inactivity.
 */
import { useId, useMemo, type RefObject } from "react";
import { weatherScene, type WeatherOutlook, type WeatherSky } from "@/lib/weather";
import { useT } from "@/ui/i18n";
import { WeatherBackdrop } from "./weather-backdrop.tsx";

const WEATHER_SKY_TEXT: Record<WeatherSky, string> = {
  "clear-day": "var(--accent-sky-ink)",
  "partly-cloudy-day": "var(--accent-sky-ink)",
  "clear-night": "var(--on-deep)",
  "partly-cloudy-night": "var(--on-deep)",
  "cloudy-day": "var(--on-deep)",
  "cloudy-night": "var(--on-deep)",
  "fog-day": "var(--ink-900)",
  "fog-night": "var(--on-deep)",
  cold: "var(--on-deep)",
  storm: "var(--on-deep)",
};

const capitalize = (text: string): string =>
  text.length === 0 ? text : `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;

type WeatherTileProps = {
  outlook: WeatherOutlook;
  /** The later day label ("Rīt" or weekday), or `null` when showing right now. */
  dayLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /** Collapsed out of sight while the school tile is expanded. */
  hidden?: boolean;
};

export const WeatherTile = ({
  outlook,
  dayLabel,
  expanded,
  onToggle,
  buttonRef,
  hidden = false,
}: WeatherTileProps) => {
  const t = useT();
  const contentId = useId();
  const scene = useMemo(() => weatherScene(outlook), [outlook]);
  const condition = t(`home.weather.${outlook.condition}`);

  const ariaLabel = [
    dayLabel === null ? null : t("home.weather.forDay", { day: dayLabel }),
    t("home.weather.label", { temperature: outlook.temperature, condition }),
    outlook.max !== null && outlook.min !== null
      ? t("home.weather.range", { max: outlook.max, min: outlook.min })
      : null,
  ]
    .filter((part) => part !== null)
    .join(". ");

  const hasRange = outlook.max !== null && outlook.min !== null;

  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid="home-weather"
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={contentId}
      inert={hidden}
      onClick={onToggle}
      className="relative flex h-full min-w-0 cursor-pointer flex-col justify-end overflow-hidden rounded-xl border-0 p-4 text-left transition-[opacity,transform] duration-(--dur-slow) ease-(--ease-standard) active:scale-(--press-scale-tile) active:duration-(--dur-instant)"
      style={{
        color: WEATHER_SKY_TEXT[scene.sky],
        opacity: hidden ? 0 : 1,
      }}
    >
      <WeatherBackdrop scene={scene} paused={hidden} />

      {dayLabel !== null ? (
        <span
          aria-hidden="true"
          data-testid="home-weather-day"
          className="relative z-10 mb-auto font-text text-micro font-bold uppercase tracking-label"
        >
          {dayLabel}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none relative z-10 mb-auto font-text text-micro font-bold uppercase tracking-label"
          style={{
            opacity: expanded ? 1 : 0,
            transform: expanded ? "translateY(0)" : "translateY(4px)",
            transition: expanded
              ? "opacity var(--dur-base) var(--ease-standard) calc(var(--dur-fast) * 0.45), transform var(--dur-base) var(--ease-standard) calc(var(--dur-fast) * 0.45)"
              : "opacity var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
          }}
        >
          {t("home.weather.now")}
        </span>
      )}

      <div
        id={contentId}
        aria-hidden="true"
        className="relative z-10 flex w-full min-w-0 items-end justify-between gap-3"
      >
        <span className="shrink-0 font-display text-display-1 leading-none tabular-nums">
          {`${String(outlook.temperature)}°`}
        </span>

        <div
          data-testid="home-weather-details"
          className="pointer-events-none absolute right-0 bottom-0 max-w-[calc(100cqw-128px)] text-right"
          style={{
            opacity: expanded ? 1 : 0,
            transform: expanded ? "translateX(0)" : "translateX(10px)",
            transition: expanded
              ? "opacity var(--dur-base) var(--ease-standard) calc(var(--dur-fast) * 0.5), transform var(--dur-base) var(--ease-standard) calc(var(--dur-fast) * 0.5)"
              : "opacity var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
          }}
        >
          <p className="font-text text-body font-bold leading-tight">{capitalize(condition)}</p>
          {hasRange && (
            <p className="mt-1 font-data text-caption leading-tight tabular-nums">
              {`${t("home.weather.dayTemp", { temp: outlook.max! })} · ${t("home.weather.nightTemp", { temp: outlook.min! })}`}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};
