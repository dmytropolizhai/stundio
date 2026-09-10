import type { LessonTone } from "./lesson-card.tsx";
import { cn } from "../../lib/utils.ts";

export type WeekGridCell = {
  /** Fixed 3-letter subject code. The DS allows abbreviation here and nowhere else. */
  short: string;
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
  className,
  cellLabel,
}: WeekGridProps<K>) => (
  <div
    className={cn("grid gap-1.5", className)}
    style={{ gridTemplateColumns: `36px repeat(${String(days.length)}, minmax(0,1fr))` }}
  >
    <span />
    {days.map((day) => (
      <span
        key={day.key}
        className={cn(
          "text-center font-text text-micro font-bold tracking-label uppercase",
          day.today === true ? "text-brand-strong" : "text-muted",
        )}
      >
        {day.weekday}
      </span>
    ))}

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
              aria-label={cellLabel?.(cell, day, period.period) ?? cell.short}
              onClick={() => {
                onSelect?.(cell, day.key, period.period);
              }}
              className={cn(
                "h-10 overflow-hidden rounded-sm border-0 px-1.5",
                "font-text text-caption font-bold text-ink-900 text-ellipsis whitespace-nowrap",
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
