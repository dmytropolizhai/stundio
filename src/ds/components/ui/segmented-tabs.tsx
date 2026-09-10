import { useRef } from "react";
import { cn } from "../../lib/utils.ts";

export type SegmentedTabItem<K extends string = string> = {
  key: K;
  label: string;
};

export type SegmentedTabsProps<K extends string = string> = {
  items: readonly SegmentedTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  label?: string;
};

/**
 * Sunken pill track, white pill on the selected segment.
 *
 * Exposed as a **radiogroup**, not a tablist. Everywhere this control is used the segments pick a
 * *value* (theme, language, building) rather than swapping a panel, and `role="tab"` without a
 * matching `tabpanel` tells a screen reader to expect content that never arrives. Radix Tabs was
 * the obvious primitive and is the wrong one here for that reason.
 *
 * Roving tabindex: only the selected segment is a tab stop, and the arrow keys move between them,
 * which is the expected keyboard model for a radio group.
 */
export const SegmentedTabs = <K extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: SegmentedTabsProps<K>) => {
  const refs = useRef(new Map<K, HTMLButtonElement>());

  const move = (from: number, delta: number) => {
    if (items.length === 0) return;
    const next = items[(from + delta + items.length) % items.length];
    if (next === undefined) return;
    onChange(next.key);
    refs.current.get(next.key)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex gap-0.5 rounded-pill bg-sunken p-1", className)}
    >
      {items.map((item, i) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            ref={(node) => {
              if (node === null) refs.current.delete(item.key);
              else refs.current.set(item.key, node);
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              onChange(item.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "h-9 cursor-pointer rounded-pill border-0 bg-transparent px-4.5",
              "font-text text-sm font-bold text-muted",
              "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-standard)",
              active && "bg-card text-strong shadow-card",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
