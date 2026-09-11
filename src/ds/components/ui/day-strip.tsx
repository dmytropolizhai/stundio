import { cn } from "../../lib/utils.ts";

export type DayStripDay<K extends string = string> = {
  key: K;
  /** Short weekday name — the caller gets it from `Intl`, never a hardcoded table. */
  weekday: string;
  /** Day of month. */
  date: string;
  /** Marks a day that has something worth noticing (a change, a cancellation). */
  dot?: boolean;
};

export type DayStripProps<K extends string = string> = {
  days: readonly DayStripDay<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  label?: string;
};

/**
 * The horizontal week pager. Selection is a fill swap — the active tile goes brand blue.
 *
 * Scrolls horizontally with the scrollbar hidden; on a phone the bar is pure noise.
 */
export const DayStrip = <K extends string>({
  days,
  value,
  onChange,
  className,
  label,
}: DayStripProps<K>) => (
  <div
    role="tablist"
    aria-label={label}
    className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}
  >
    {days.map((day) => {
      const active = day.key === value;
      return (
        <button
          key={day.key}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => {
            onChange(day.key);
          }}
          className={cn(
            "flex h-[74px] min-w-[46px] flex-[1_0_46px] cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden",
            "rounded-lg border-0",
            "transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) ease-(--ease-standard)",
            "active:scale-(--press-scale) active:duration-(--dur-instant)",
            active ? "bg-brand text-white shadow-brand" : "bg-card text-fg shadow-hairline",
          )}
        >
          <span
            className={cn(
              "max-w-full truncate font-text text-micro font-bold tracking-[.08em] uppercase",
              active ? "opacity-85" : "opacity-55",
            )}
          >
            {day.weekday}
          </span>
          <span className="font-display text-[22px] leading-none font-black">{day.date}</span>
          <span
            aria-hidden="true"
            className={cn(
              "size-[5px] rounded-pill",
              day.dot === true ? (active ? "bg-white" : "bg-brand") : "bg-transparent",
            )}
          />
        </button>
      );
    })}
  </div>
);
