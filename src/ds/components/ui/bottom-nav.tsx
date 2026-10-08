import { useState, type CSSProperties } from "react";
import { cn, Icon, type IconName } from "@/ds";

export type BottomNavItem<K extends string = string> = {
  key: K;
  icon: IconName;
  label: string;
};

export type BottomNavProps<K extends string = string> = {
  items: readonly BottomNavItem<K>[];
  /** The selected key — or one of a sibling nav's, in which case nothing here is active. */
  value: K;
  onChange: (key: K) => void;
  className?: string;
  /** Merged over the grid template — e.g. a flex share when several navs sit in one row. */
  style?: CSSProperties;
  /**
   * Icon-only: every slot shrinks to a 52px circle and the pill hugs its icons instead of
   * stretching. The label still names each button for assistive tech.
   */
  compact?: boolean;
  /** Accessible name for the landmark. */
  label?: string;
};

/**
 * The floating pill. The DS fixes it 20px above the bottom edge with a 16px side inset. It sits on
 * the card surface (white in light theme, dark card in dark theme), so it reads as chrome rather
 * than an inverted callout, matching every other floating surface in the system.
 *
 * The active tab is a *fill swap*, not an indicator line: an inverse-fill pill, sized to exactly
 * one equal-width slot, slides beneath the icons to the selected tab. Every slot is the same width,
 * so `translateX` in multiples of the pill's own width always lands exactly on the next tab —
 * no measuring, no ResizeObserver. The slide is one of the few two places the spring easing is
 * allowed (the other is the bottom sheet's entrance).
 *
 * Several navs can float side by side, each owning a slice of the app's tabs. When `value` belongs
 * to a sibling, the active pill fades out *where it was* — so coming back slides it from the tab
 * you left rather than snapping in from the first slot.
 */
export const BottomNav = <K extends string>({
  items,
  value,
  onChange,
  className,
  style,
  compact = false,
  label,
}: BottomNavProps<K>) => {
  const activeIndex = items.findIndex((item) => item.key === value);
  // React's "adjust state while rendering" pattern: remember the last slot that was active.
  const [lastIndex, setLastIndex] = useState(Math.max(0, activeIndex));
  if (activeIndex !== -1 && activeIndex !== lastIndex) setLastIndex(activeIndex);
  const pillIndex = activeIndex === -1 ? lastIndex : activeIndex;

  return (
    <nav
      aria-label={label}
      className={cn(
        "relative grid h-nav-height rounded-pill bg-card p-1.5 shadow-nav",
        compact && "flex-none",
        className,
      )}
      style={{
        ...style,
        gridTemplateColumns: compact
          ? `repeat(${items.length}, calc(var(--nav-height) - 12px))`
          : `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1.5 left-1.5 rounded-pill bg-inverse",
          "transition-[transform,opacity] duration-(--dur-base) ease-spring",
          activeIndex === -1 && "opacity-0",
        )}
        style={{
          width: `calc((100% - 12px) / ${items.length})`,
          transform: `translateX(calc(${pillIndex} * 100%))`,
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
              "relative z-10 inline-flex flex-col cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent gap-1",
              "transition-colors duration-(--dur-fast) ease-standard",
              "active:scale-(--press-scale) active:duration-(--dur-instant)",
              active ? "text-on-inverse" : "text-muted",
            )}
          >
            <Icon name={item.icon} size={23} />
            {!compact && (
              <span className={cn("text-micro font-black", !active && "font-normal")}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
