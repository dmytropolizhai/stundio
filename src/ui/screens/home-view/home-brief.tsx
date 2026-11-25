/**
 * The top of Home: a 2-column grid of square tiles — school countdown on the left, Riga's
 * animated weather sky on the right — followed by a single changes chip when relevant, and
 * then the glance card (or tomorrow's preview) as `children`.
 *
 * Tapping either interactive tile expands it horizontally across the grid (`1fr 1fr` →
 * `2fr 0fr` or `0fr 2fr`) while locking row height to the collapsed square so nothing below
 * shifts.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ISODate } from "@/lib/edupage";
import { schoolCountdown, schoolDayProgress, type DayBrief } from "@/lib/schedule";
import type { WeatherOutlook } from "@/lib/weather";
import { addDays } from "@/sync";
import { Badge } from "@/ds";
import { formatWeekdayLong, useLang, useT } from "@/ui/i18n";
import { SchoolTile } from "./school-tile.tsx";
import { WeatherTile } from "./weather-tile.tsx";

const AUTO_COLLAPSE_MS = 6000;

type ExpandedTile = "school" | "weather" | null;

/** "Rīt" for tomorrow, else the weekday — the label a later day's tile carries. */
const useDayLabel = (date: ISODate | null, today: ISODate): string | null => {
  const t = useT();
  const lang = useLang();
  if (date === null) return null;
  return date === addDays(today, 1) ? t("day.tomorrow") : formatWeekdayLong(date, lang);
};

type HomeBriefProps = {
  brief: DayBrief | null;
  /** The later browsed day `brief` is about; `null` when it is about today. */
  briefDate?: ISODate | null;
  /** Current Riga time in minutes since midnight, used for the live countdown. */
  nowMinutes: number;
  weather: WeatherOutlook | null;
  /** The later browsed day `weather` is a forecast for; `null` when it is about right now. */
  weatherDate: ISODate | null;
  today: ISODate;
  /** The brief's day's changed lessons; the schedule below carries the button to them. */
  changedCount: number;
  /** Suppresses the static changes chip when the adjacent schedule horizon strip already renders an interactive one. */
  hideChangesChip?: boolean;
  /** Fires whenever the weather tile expands or collapses so Home can tint its backdrop. */
  onWeatherExpandedChange?: (expanded: boolean) => void;
  /** The glance card or tomorrow's preview, rendered by the screen. */
  children?: ReactNode;
};

export const HomeBrief = ({
  brief,
  briefDate = null,
  nowMinutes,
  weather,
  weatherDate,
  today,
  changedCount,
  hideChangesChip = false,
  onWeatherExpandedChange,
  children,
}: HomeBriefProps) => {
  const t = useT();
  const [expandedTile, setExpandedTile] = useState<ExpandedTile>(null);
  const schoolRef = useRef<HTMLButtonElement | null>(null);
  const weatherRef = useRef<HTMLButtonElement | null>(null);

  const countdown = useMemo(
    () => schoolCountdown(brief, nowMinutes, briefDate !== null),
    [brief, nowMinutes, briefDate],
  );
  const progress = useMemo(
    () => schoolDayProgress(brief, nowMinutes, briefDate !== null),
    [brief, nowMinutes, briefDate],
  );
  const briefLabel = useDayLabel(briefDate, today);
  const weatherLabel = useDayLabel(weatherDate, today);

  const schoolInteractive =
    countdown !== null && (countdown.kind === "until" || countdown.kind === "startsAt");
  const activeExpanded: ExpandedTile =
    expandedTile === "school" && schoolInteractive
      ? "school"
      : expandedTile === "weather" && weather !== null
        ? "weather"
        : null;

  useEffect(() => {
    onWeatherExpandedChange?.(activeExpanded === "weather");
    return () => {
      onWeatherExpandedChange?.(false);
    };
  }, [activeExpanded, onWeatherExpandedChange]);

  useEffect(() => {
    if (activeExpanded === null) return;

    const timer = window.setTimeout(() => {
      setExpandedTile(null);
    }, AUTO_COLLAPSE_MS);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedTile(null);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      const activeEl = activeExpanded === "school" ? schoolRef.current : weatherRef.current;
      if (target instanceof Node && activeEl !== null && !activeEl.contains(target)) {
        setExpandedTile(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [activeExpanded]);

  const showChanges =
    !hideChangesChip && changedCount > 0 && brief !== null && brief.kind !== "finished";

  if (brief === null && weather === null && children === undefined) return null;

  const hasSchool = brief !== null && countdown !== null;
  const hasWeather = weather !== null;
  const both = hasSchool && hasWeather;

  const gridTemplateColumns = !both
    ? "1fr"
    : activeExpanded === "school"
      ? "2fr 0fr"
      : activeExpanded === "weather"
        ? "0fr 2fr"
        : "1fr 1fr";

  return (
    <section aria-labelledby="home-today" className="mt-2" data-testid="home-hero">
      <h2 id="home-today" className="sr-only">
        {t("home.today")}
      </h2>

      {(hasSchool || hasWeather) && (
        <div style={{ containerType: "inline-size" }}>
          <div
            data-testid="home-tiles"
            className="grid overflow-hidden"
            style={{
              height: "calc((100cqw - 12px) / 2)",
              gridTemplateColumns,
              columnGap: both && activeExpanded === null ? "12px" : "0px",
              transition:
                "grid-template-columns var(--dur-slow) var(--ease-standard), column-gap var(--dur-slow) var(--ease-standard)",
            }}
          >
            {hasSchool && (
              <SchoolTile
                brief={brief}
                countdown={countdown}
                progress={progress}
                dayLabel={briefLabel}
                later={briefDate !== null}
                expanded={activeExpanded === "school"}
                hidden={both && activeExpanded === "weather"}
                onToggle={() => {
                  setExpandedTile((cur) => (cur === "school" ? null : "school"));
                }}
                buttonRef={schoolRef}
              />
            )}
            {hasWeather && (
              <WeatherTile
                outlook={weather}
                dayLabel={weatherLabel}
                expanded={activeExpanded === "weather"}
                hidden={both && activeExpanded === "school"}
                onToggle={() => {
                  setExpandedTile((cur) => (cur === "weather" ? null : "weather"));
                }}
                buttonRef={weatherRef}
              />
            )}
          </div>
        </div>
      )}

      {showChanges && (
        <div className="mt-2.5 flex items-center">
          <Badge tone="warning" uppercase={false} data-testid="home-brief-changes">
            {t("home.brief.changes", { count: changedCount })}
          </Badge>
        </div>
      )}

      {children}
    </section>
  );
};
