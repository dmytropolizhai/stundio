import type { LessonTone } from "./lesson-card.tsx";
import { cn } from "../../lib/utils.ts";

export type WeekGridCell = {
  /** Short subject code. The DS allows abbreviation here and nowhere else. */
  short: string;
  /** Unabbreviated subject name. Not drawn — it is what assistive tech announces. */
  name?: string;
  tone?: LessonTone;
  cancelled?: boolean;
  /**
   * The lesson's building, set only when it is not the school's main building. Draws a hairline
   * outline on the cell — the fill still carries the subject colour, this only says "elsewhere" —
   * and folds into the cell's accessible label so the fact isn't colour-only.
   */
  building?: string;
  /**
   * Rows this one lesson structurally occupies (EduPage's `durationperiods` — a combined double
   * lesson like a 2-period Sports block). Always rendered as one spanning cell, independent of
   * `mergeConsecutive`, which is only for visually coalescing separately-scheduled identical
   * lessons that merely happen to sit back-to-back. Defaults to 1.
   */
  span?: number;
};

export type WeekGridDay<K extends string = string> = {
  key: K;
  weekday: string;
  today?: boolean;
};

export type WeekGridPeriod<K extends string = string> = {
  period: number;
  start: string;
  end: string;
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
  /**
   * Collapse a run of consecutive identical lessons for one day into a single cell spanning
   * those rows, instead of stacking identical pills. Off by default — a user setting.
   */
  mergeConsecutive?: boolean;
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

type Placement = { cell: WeekGridCell; span: number } | "covered";

const sameCell = (a: WeekGridCell, b: WeekGridCell): boolean =>
  a.short === b.short &&
  (a.tone ?? "sky") === (b.tone ?? "sky") &&
  (a.cancelled ?? false) === (b.cancelled ?? false) &&
  (a.building ?? "") === (b.building ?? "");

/**
 * Placement per row for one day column.
 *
 * First pass: every cell always occupies its own structural `span` (a combined double lesson —
 * EduPage's `durationperiods` — regardless of `mergeConsecutive`), and the rows it covers come
 * back as `"covered"` (render nothing — the spanning cell above already fills that grid area).
 *
 * Second pass, only with `mergeConsecutive`: adjacent placements carrying an identical cell
 * additionally coalesce into one taller placement — this is for two separately-scheduled
 * lessons that merely happen to sit back-to-back, not a lesson's own structural span.
 */
const placementsFor = <K extends string>(
  day: WeekGridDay<K>,
  periods: readonly WeekGridPeriod<K>[],
  mergeConsecutive: boolean,
): (Placement | undefined)[] => {
  const raw = periods.map((p) => p.cells[day.key]);

  const out = new Array<Placement | undefined>(raw.length).fill(undefined);
  let i = 0;
  while (i < raw.length) {
    const cell = raw[i];
    if (cell === undefined) {
      i += 1;
      continue;
    }
    const span = Math.min(Math.max(1, cell.span ?? 1), raw.length - i);
    out[i] = { cell, span };
    for (let k = 1; k < span; k += 1) out[i + k] = "covered";
    i += span;
  }

  if (!mergeConsecutive) return out;

  i = 0;
  while (i < out.length) {
    const placement = out[i];
    if (placement === undefined || placement === "covered") {
      i += 1;
      continue;
    }
    let { span } = placement;
    let j = i + span;
    while (j < out.length) {
      const next = out[j];
      if (next === undefined || next === "covered" || !sameCell(placement.cell, next.cell)) break;
      for (let k = 0; k < next.span; k += 1) out[j + k] = "covered";
      span += next.span;
      j += next.span;
    }
    out[i] = { cell: placement.cell, span };
    i += span;
  }

  return out;
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
  mergeConsecutive = false,
}: WeekGridProps<K>) => (
  <div
    className={cn("grid gap-1.5", className)}
    style={{ gridTemplateColumns: `46px repeat(${String(days.length)}, minmax(0,1fr))` }}
  >
    <span />
    {days.map((day) => {
      // `min-w-0` lets the heading actually honour the column's `minmax(0,1fr)` track;
      // without it a grid item's implicit min-width is its content's, so a long weekday
      // abbreviation (Latvian "ceturtd." is 8 characters) overflows into the next column
      // instead of truncating.
      const heading = cn(
        "min-w-0 truncate rounded-sm px-0.5 text-center font-text text-micro font-bold tracking-label uppercase",
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
          className={cn(
            heading,
            // A line-height rather than `flex items-center` for the 44px tap target: a flex
            // container centers the anonymous text box as an unconstrained flex item, which
            // defeats `truncate`'s ellipsis (Chrome/Firefox clip it silently instead).
            "min-h-11 cursor-pointer border-0 bg-transparent leading-11 hover:bg-sunken",
          )}
        >
          {day.weekday}
        </button>
      );
    })}

    {periods.map((period, rowIndex) => (
      // `h-10` here (not just on cells) keeps every row at least one lesson-cell tall, even a
      // row every day's lesson merges away from (see `placementsFor`) — otherwise that row
      // would collapse to the label text's own height and break the grid's vertical rhythm.
      <span
        key={`t-${period.period}`}
        className="u-data flex h-10 items-center text-muted"
        style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
      >
        {period.start}
      </span>
    ))}

    {/*
      Every other row's label is its *start* time — the next row down implies where it ends.
      The last row has no next row, so without this the grid's final lesson (and any block that
      merges into it) reads as if it stops at the last period's start rather than its actual end.
    */}
    {periods.length > 0 && (
      <span
        className="u-data flex h-4 items-start text-muted"
        style={{ gridColumn: 1, gridRow: periods.length + 2 }}
      >
        {periods[periods.length - 1]?.end}
      </span>
    )}

    {days.map((day, colIndex) =>
      placementsFor(day, periods, mergeConsecutive).map((placement, rowIndex) => {
        const gridColumn = colIndex + 2;
        const gridRow = rowIndex + 2;
        if (placement === "covered") return null;
        if (placement === undefined) {
          // `shadow-hairline` gives the block a boundary independent of fill contrast —
          // `--surface-sunken` sits only a few levels above `--bg-app` in dark mode, so an
          // unbordered fill nearly disappears into the page there.
          return (
            <span
              key={`${day.key}-${rowIndex}`}
              aria-hidden="true"
              className="h-10 rounded-sm bg-sunken shadow-hairline"
              style={{ gridColumn, gridRow }}
            />
          );
        }
        const { cell, span } = placement;
        const period = periods[rowIndex];
        if (period === undefined) return null;
        return (
          <button
            key={`${day.key}-${rowIndex}`}
            type="button"
            data-testid="week-cell"
            aria-label={cellLabel?.(cell, day, period.period) ?? cell.name ?? cell.short}
            // Free on desktop (hover), inert on the touch device this app actually ships on —
            // tapping already opens the full lesson sheet with the name.
            title={
              cell.building === undefined
                ? (cell.name ?? cell.short)
                : `${cell.name ?? cell.short} · ${cell.building}`
            }
            onClick={() => {
              onSelect?.(cell, day.key, period.period);
            }}
            style={{
              gridColumn,
              gridRow: span === 1 ? gridRow : `${String(gridRow)} / span ${String(span)}`,
            }}
            className={cn(
              "truncate rounded-sm border-0 px-1.5",
              "font-text text-caption font-bold text-ink-900",
              TONE_BG[cell.tone ?? "sky"],
              cell.cancelled === true && "opacity-40 line-through",
              cell.building !== undefined && "inset-ring-2 inset-ring-strong-border",
              onSelect === undefined ? "cursor-default" : "cursor-pointer",
            )}
          >
            {cell.short}
          </button>
        );
      }),
    )}
  </div>
);
