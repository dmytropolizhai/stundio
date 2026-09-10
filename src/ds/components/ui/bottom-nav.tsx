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
 * The floating black pill. The DS fixes it 20px above the bottom edge with a 16px side inset.
 *
 * The active tab is a *fill swap*, not an indicator line: the tab becomes a white pill that grows
 * to include its label. That growth is one of the only two places the spring easing is allowed.
 */
export const BottomNav = <K extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: BottomNavProps<K>) => (
  <nav
    aria-label={label}
    className={cn(
      "flex h-nav-height items-center gap-1 rounded-pill bg-ink-900 p-1.5 shadow-nav",
      className,
    )}
  >
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
            "inline-flex h-13 items-center justify-center gap-2 rounded-pill border-0 cursor-pointer",
            "transition-[background-color,color,padding,flex] duration-(--dur-base) ease-(--ease-spring)",
            active
              ? "flex-none bg-white px-5 text-ink-900"
              : "flex-1 basis-0 bg-transparent px-0 text-white/62",
          )}
        >
          <Icon name={item.icon} size={22} />
          {active && <span className="font-text text-sm font-bold">{item.label}</span>}
        </button>
      );
    })}
  </nav>
);
