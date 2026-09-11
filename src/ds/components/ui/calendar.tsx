import { useState } from "react";
import { IconButton } from "./icon-button.tsx";
import { cn } from "../../lib/utils.ts";

/** `"YYYY-MM-DD"`, the same date-only shape `ISODate` uses in the app layer — the DS stays free
 * of that type so it does not have to import from `lib/edupage`. */
type DateString = string;

const pad2 = (n: number): string => String(n).padStart(2, "0");

const parts = (date: DateString): { y: number; m: number; d: number } => {
  const [y, m, d] = date.split("-").map(Number);
  return { y: y ?? 1970, m: (m ?? 1) - 1, d: d ?? 1 };
};

const toDateString = (y: number, m: number, d: number): DateString =>
  `${String(y).padStart(4, "0")}-${pad2(m + 1)}-${pad2(d)}`;

/** UTC noon: a date-only value carries no timezone, and noon survives any DST shift. */
const toDate = (date: DateString): Date => new Date(`${date}T12:00:00Z`);

const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Monday-first weekday index (0 = Monday … 6 = Sunday) for the first of `y`-`m`. */
const leadingBlanks = (y: number, m: number): number =>
  (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;

export type CalendarProps = {
  /** The selected date, controlled. */
  value: DateString;
  /** Today's date — gets the ring treatment, distinct from `value`. */
  today: DateString;
  onSelect: (date: DateString) => void;
  /** BCP-47 tag for month and weekday names — Chrome is translated, so this is a prop, not a default. */
  locale: string;
  prevMonthLabel: string;
  nextMonthLabel: string;
  className?: string;
};

/**
 * A month grid, styled but domain-free: it knows nothing about lessons, classes or substitutions,
 * only the calendar. `DayView`'s popover supplies the locale and the "today" jump; everything else
 * is this component's own state so it forgets which month it was showing every time it closes.
 */
export const Calendar = ({
  value,
  today,
  onSelect,
  locale,
  prevMonthLabel,
  nextMonthLabel,
  className,
}: CalendarProps) => {
  const initial = parts(value);
  const [view, setView] = useState({ y: initial.y, m: initial.m });

  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const blanks = leadingBlanks(view.y, view.m);
  const total = daysInMonth(view.y, view.m);
  const cells: ({ date: DateString; inMonth: boolean } | null)[] = [];

  for (let i = 0; i < blanks; i++) cells.push(null);
  for (let d = 1; d <= total; d++)
    cells.push({ date: toDateString(view.y, view.m, d), inMonth: true });
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    // Monday (2026-09-07 is a Monday) is the anchor so the header matches `leadingBlanks`.
    weekdayFmt.format(new Date(Date.UTC(2026, 8, 7 + i, 12))),
  );

  const goToMonth = (delta: number) => {
    setView(({ y, m }) => {
      const next = new Date(Date.UTC(y, m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });
  };

  return (
    <div className={cn("w-[296px]", className)}>
      <div className="mb-2 flex items-center justify-between">
        <IconButton
          icon="chevron-left"
          label={prevMonthLabel}
          variant="bare"
          size="sm"
          onClick={() => {
            goToMonth(-1);
          }}
        />
        <span className="font-text text-body font-bold text-strong capitalize">
          {monthFmt.format(new Date(Date.UTC(view.y, view.m, 1, 12)))}
        </span>
        <IconButton
          icon="chevron-right"
          label={nextMonthLabel}
          variant="bare"
          size="sm"
          onClick={() => {
            goToMonth(1);
          }}
        />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, i) => (
          <div
            key={i}
            className="flex h-6 items-center justify-center font-text text-micro font-bold text-muted"
          >
            {label}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (cell === null) return <div key={i} aria-hidden="true" />;

          const isToday = cell.date === today;
          const isSelected = cell.date === value;

          return (
            <button
              key={cell.date}
              type="button"
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              onClick={() => {
                onSelect(cell.date);
              }}
              className={cn(
                "u-data flex size-10 items-center justify-center rounded-pill font-bold",
                "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-standard)",
                "active:scale-(--press-scale)",
                isSelected
                  ? "bg-ink-900 text-white"
                  : isToday
                    ? "text-brand-strong inset-ring-2 inset-ring-brand hover:bg-sunken"
                    : "text-fg hover:bg-sunken",
              )}
            >
              {toDate(cell.date).getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
