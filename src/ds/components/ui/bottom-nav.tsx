import { useState } from "react";
import { cn, Icon, type IconName } from "@/ds";

export type BottomNavItem<K extends string = string> = {
  key: K;
  icon: IconName;
  label: string;
  /** Optional count badge shown on the icon (capped at "9+"; hidden when <= 0). */
  badge?: number | undefined;
  /** Accessible name override (e.g. "Changes, 3" when a badge is shown). */
  ariaLabel?: string | undefined;
  /** Popup metadata for an overflow slot such as "More". */
  hasPopup?: "dialog" | undefined;
  /** Expanded state when `hasPopup` is set. */
  expanded?: boolean | undefined;
};

export type BottomNavProps<K extends string = string> = {
  items: readonly BottomNavItem<K>[];
  /** The currently active slot key. */
  value: K;
  onChange: (key: K) => void;
  className?: string;
  /** Accessible name for the landmark. */
  label?: string;
};

const ACTIVE_SLOT_WEIGHT = 1.9;

/**
 * The phone's floating liquid-glass bottom bar: 64px tall (`h-nav-height`), `rounded-pill`,
 * frosted glass with a directional specular rim (`.u-nav-glass`), holding icon slots (minimum
 * 48px touch target each) that expand smoothly when selected to reveal the active tab's label
 * beside its icon.
 *
 * The active tab sits inside a translucent frosted lens pill (`.u-nav-pill`) that glides across
 * the bar on `--ease-spring`. Inactive slots share weight `1` while the active slot takes weight
 * `ACTIVE_SLOT_WEIGHT` (`1.9`), so the sum of weights stays constant during transitions and the
 * pill's target width and `translateX` resolve purely from index math — no measuring, no
 * ResizeObserver, and zero jitter on interruption.
 */
export const BottomNav = <K extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: BottomNavProps<K>) => {
  const activeIndex = items.findIndex((item) => item.key === value);
  // React's "adjust state while rendering" pattern: remember the last slot that was active.
  const [lastIndex, setLastIndex] = useState(Math.max(0, activeIndex));
  if (activeIndex !== -1 && activeIndex !== lastIndex) setLastIndex(activeIndex);
  const pillIndex = activeIndex === -1 ? lastIndex : activeIndex;

  const count = Math.max(1, items.length);
  const activeWeight = count > 1 ? ACTIVE_SLOT_WEIGHT : 1;
  const totalWeight = count > 1 ? count - 1 + activeWeight : 1;
  const pillWidthPct = (activeWeight / totalWeight) * 100;
  const pillTranslatePct = (pillIndex / activeWeight) * 100;

  return (
    <nav
      aria-label={label}
      className={cn("u-nav-glass flex h-nav-height items-center rounded-pill p-1.5", className)}
    >
      <span
        aria-hidden="true"
        data-testid="bottom-nav-pill"
        className={cn(
          "u-nav-pill pointer-events-none absolute inset-y-1.5 left-1.5 z-0 rounded-pill",
          "transition-[transform,width,opacity] duration-(--dur-base) ease-spring",
          activeIndex === -1 && "opacity-0",
        )}
        style={{
          width: `calc((100% - 12px) * ${pillWidthPct} / 100)`,
          transform: `translateX(${pillTranslatePct}%)`,
        }}
      />
      {items.map((item) => {
        const active = item.key === value;
        const badgeText =
          item.badge !== undefined && item.badge > 0
            ? item.badge > 9
              ? "9+"
              : String(item.badge)
            : null;
        return (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.ariaLabel ?? item.label}
            aria-current={active ? "page" : undefined}
            aria-haspopup={item.hasPopup}
            aria-expanded={item.hasPopup !== undefined ? (item.expanded ?? false) : undefined}
            onClick={() => {
              onChange(item.key);
            }}
            style={{
              flexGrow: active ? activeWeight : 1,
              flexBasis: 0,
            }}
            className={cn(
              "relative z-10 inline-flex h-full min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent px-2",
              "transition-[flex-grow,color,transform] duration-(--dur-base) ease-spring",
              "active:scale-(--press-scale) active:duration-(--dur-instant)",
              active
                ? "text-(--nav-icon-active)"
                : "text-(--nav-icon-idle) hover:text-(--nav-icon-hover)",
            )}
          >
            <span className="relative inline-flex shrink-0 items-center justify-center">
              <Icon
                name={item.icon}
                size={22}
                strokeWidth={active ? 2.25 : 1.75}
                className={cn(
                  "transition-transform duration-(--dur-base) ease-standard",
                  active && "scale-[1.03]",
                )}
              />
              {badgeText !== null && (
                <span
                  aria-hidden="true"
                  data-testid="nav-badge"
                  className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 font-text text-[10px] leading-none font-bold text-on-danger shadow-sm"
                >
                  {badgeText}
                </span>
              )}
            </span>
            <span
              aria-hidden={!active}
              data-testid="nav-label"
              data-active={active ? "true" : "false"}
              className={cn(
                "grid overflow-hidden transition-[grid-template-columns,opacity,margin] duration-(--dur-base) ease-standard",
                active
                  ? cn(
                      badgeText !== null ? "ml-2.5" : "ml-2",
                      "grid-cols-[1fr] opacity-100 delay-[35ms]",
                    )
                  : "ml-0 grid-cols-[0fr] opacity-0 duration-(--dur-fast) delay-0",
              )}
            >
              <span
                className={cn(
                  "min-w-0 truncate font-text text-[13px] leading-none font-semibold tracking-tight whitespace-nowrap",
                  "transition-transform duration-(--dur-base) ease-standard",
                  active ? "translate-x-0 delay-[35ms]" : "-translate-x-1.5 duration-(--dur-fast)",
                )}
              >
                {item.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
};
