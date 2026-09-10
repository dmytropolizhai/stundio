import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

/*
 * Selection in this system is a *fill swap*, not a border — a selected chip goes solid black. That
 * is why `selected` overrides `tone` outright instead of layering a ring on top of it.
 */
const chipVariants = cva(
  [
    "inline-flex h-8 items-center gap-1.5 rounded-pill border-0",
    "font-text text-caption font-bold whitespace-nowrap",
    "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-standard)",
  ],
  {
    variants: {
      tone: {
        neutral: "bg-card text-fg shadow-hairline",
        brandTint: "bg-brand-tint text-brand-strong",
        onBrand: "bg-white/16 text-white inset-ring-1 inset-ring-on-brand-border",
      },
      selected: { true: "bg-ink-900 text-white shadow-none inset-ring-0", false: "" },
      interactive: { true: "cursor-pointer active:scale-(--press-scale)", false: "cursor-default" },
      hasIcon: { true: "pr-3.5 pl-[11px]", false: "px-3.5" },
    },
    /* `selected` is a full override, so it has to win over whatever `tone` set. */
    compoundVariants: [
      { selected: true, tone: "neutral", class: "bg-ink-900 text-white shadow-none" },
      { selected: true, tone: "brandTint", class: "bg-ink-900 text-white" },
      { selected: true, tone: "onBrand", class: "bg-ink-900 text-white inset-ring-0" },
    ],
    defaultVariants: { tone: "neutral", selected: false, interactive: false, hasIcon: false },
  },
);

/*
 * Typed against `HTMLElement` rather than a specific tag: a chip is a `<button>` when it does
 * something and a `<span>` when it does not, and both accept exactly this attribute set.
 */
export type ChipProps = HTMLAttributes<HTMLElement> &
  Pick<VariantProps<typeof chipVariants>, "tone" | "selected"> & {
    icon?: IconName;
  };

/**
 * Renders a `<button>` when it can be clicked and a `<span>` otherwise, so a purely decorative
 * chip does not land in the tab order.
 */
export const Chip = ({
  className,
  tone,
  selected,
  icon,
  onClick,
  children,
  ...props
}: ChipProps) => {
  const interactive = onClick !== undefined;
  const classes = cn(
    chipVariants({ tone, selected, interactive, hasIcon: icon !== undefined }),
    className,
  );
  const content = (
    <>
      {icon !== undefined && <Icon name={icon} size={14} />}
      {children}
    </>
  );

  if (!interactive) {
    return (
      <span className={classes} {...props}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected ?? false}
      onClick={onClick}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
};
