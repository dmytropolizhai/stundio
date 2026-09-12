import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

export type BottomNavItem<K extends string = string> = {
  key: K;
  icon: IconName;
  label: string;
};

export type BottomNavProps<K extends string = string> = {
  items: readonly BottomNavItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  /** Accessible name for the landmark. */
  label?: string;
};

/**
 * The floating pill. The DS fixes it 20px above the bottom edge with a 16px side inset. It sits on
 * the card surface (white in light theme, dark card in dark theme) so it reads as chrome rather
 * than an inverted callout, matching every other floating surface in the system.
 *
 * The active tab is a *fill swap*, not an indicator line: an inverse-fill pill, sized to exactly
 * one equal-width slot, slides beneath the icons to the selected tab. Every slot is the same width
 * so `translateX` in multiples of the pill's own width always lands exactly on the next tab —
 * no measuring, no ResizeObserver. The slide is one of the only two places the spring easing is
 * allowed (the other is the bottom sheet's entrance).
 */
export const BottomNav = <K extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: BottomNavProps<K>) => {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );

  return (
    <nav
      aria-label={label}
      className={cn("relative grid h-nav-height rounded-pill bg-card p-1.5 shadow-nav", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1.5 left-1.5 rounded-pill bg-inverse transition-transform duration-(--dur-base) ease-(--ease-spring)"
        style={{
          width: `calc((100% - 12px) / ${items.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onChange(item.key);
            }}
            className={cn(
              "relative z-10 inline-flex cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent",
              "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
              "active:scale-(--press-scale) active:duration-(--dur-instant)",
              active ? "text-on-inverse" : "text-muted",
            )}
          >
            <Icon name={item.icon} size={22} />
          </button>
        );
      })}
    </nav>
  );
};
