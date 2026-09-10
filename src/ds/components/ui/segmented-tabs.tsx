import * as Tabs from "@radix-ui/react-tabs";
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
 * Built on Radix Tabs so arrow-key roving focus and the `tablist`/`tab` wiring come for free —
 * the published component sets the ARIA attributes by hand but leaves the keyboard behaviour out.
 * Rendered as a standalone control (no `Tabs.Content`); the caller owns what the selection shows.
 */
export const SegmentedTabs = <K extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: SegmentedTabsProps<K>) => (
  <Tabs.Root
    value={value}
    onValueChange={(next) => {
      onChange(next as K);
    }}
    activationMode="automatic"
  >
    <Tabs.List
      aria-label={label}
      className={cn("inline-flex gap-0.5 rounded-pill bg-sunken p-1", className)}
    >
      {items.map((item) => (
        <Tabs.Trigger
          key={item.key}
          value={item.key}
          className={cn(
            "h-9 cursor-pointer rounded-pill border-0 bg-transparent px-4.5",
            "font-text text-sm font-bold text-muted",
            "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-standard)",
            "data-[state=active]:bg-card data-[state=active]:text-strong data-[state=active]:shadow-card",
          )}
        >
          {item.label}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  </Tabs.Root>
);
