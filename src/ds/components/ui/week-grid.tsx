import type { LessonTone } from "./lesson-card.tsx";
import { cn } from "../../lib/utils.ts";

export type WeekGridCell = {
  /** Short subject code. The DS allows abbreviation here and nowhere else. */
  short: string;
  /** Unabbreviated subject name. Not drawn — it is what assistive tech announces. */
  name?: string;
  tone?: LessonTone;
  cancelled?: boolean;
};

export type WeekGridDay<K extends string = string> = {
  key: K;
  weekday: string;
  today?: boolean;
};

export type WeekGridPeriod<K extends string = string> = {
  period: number;
  start: string;
  cells: Partial<Record<K, WeekGridCell>>;
};

export type WeekGridProps<K extends string = string> = {
  days: readonly WeekGridDay<K>[];
  periods: readonly WeekGridPeriod<K>[];
  onSelect?: (cell: WeekGridCell, day: K, period: number) => void;
  /**
   * Makes the weekday headers tappable — a shortcut from the week overview into one day.
   *
   * Beyond the published DS component, which renders the headers as inert text. The affordance
   * predates the design system in this app and dropping it would be a regression, so it is opt-in
   * rather than assumed: with no handler the headers stay plain text, exactly as designed.
   */
  onSelectDay?: (day: K) => void;
  className?: string;
  /** Accessible label for each cell, so a 3-letter code is not the only thing announced. */
  cellLabel?: (cell: WeekGridCell, day: WeekGridDay<K>, period: number) => string;
};

const TONE_BG: Record<LessonTone, string> = {
  amber: "bg-amber",
  sky: "bg-sky",
  lilac: "bg-lilac",
  pink: "bg-pink",
  mint: "bg-mint",
  lime: "bg-lime",
  brand: "bg-brand",
};

/**
 * The whole week at a glance: one 12px cell per lesson, subject colour carried through from the
 * day view. Empty cells are `--ink-400` territory — a non-text grey, never a place for a string.
 *
 * Cells keep their dark ink even in dark mode: the accent fills are light pastels in both themes,
 * so `text-ink-900` stays the correct pairing.
 */
export const WeekGrid = <K extends string>({
  days,
  periods,
  onSelect,
  onSelectDay,
  className,
  cellLabel,
}: WeekGridProps<K>) => (
  <div
    className={cn("grid gap-1.5", className)}
    style={{ gridTemplateColumns: `36px repeat(${String(days.length)}, minmax(0,1fr))` }}
  >
    <span />
    {days.map((day) => {
      const heading = cn(
        "rounded-sm text-center font-text text-micro font-bold tracking-label uppercase",
        day.today === true ? "text-brand-strong" : "text-muted",
      );
      return onSelectDay === undefined ? (
        <span key={day.key} className={heading}>
          {day.weekday}
        </span>
      ) : (
        <button
          key={day.key}
          type="button"
          onClick={() => {
            onSelectDay(day.key);
          }}
          className={cn(heading, "cursor-pointer border-0 bg-transparent py-1 hover:bg-sunken")}
        >
          {day.weekday}
        </button>
      );
    })}

    {periods.map((period) => (
      <div key={period.period} className="contents">
        <span className="u-data self-center text-[11px] text-muted">{period.start}</span>
        {days.map((day) => {
          const cell = period.cells[day.key];
          if (cell === undefined) {
            return <span key={day.key} aria-hidden="true" className="h-10 rounded-sm bg-sunken" />;
          }
          return (
            <button
              key={day.key}
              type="button"
              aria-label={cellLabel?.(cell, day, period.period) ?? cell.name ?? cell.short}
              onClick={() => {
                onSelect?.(cell, day.key, period.period);
              }}
              className={cn(
                "h-10 truncate rounded-sm border-0 px-1.5",
                "font-text text-caption font-bold text-ink-900",
                TONE_BG[cell.tone ?? "sky"],
                cell.cancelled === true && "opacity-40 line-through",
                onSelect === undefined ? "cursor-default" : "cursor-pointer",
              )}
            >
              {cell.short}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);
