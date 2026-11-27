import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

/*
 * `glass` is one of exactly two places the DS allows transparency and blur, and it is only legal
 * over the blue hero — never over white, never as a frosted card on the grey app background.
 */
const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-pill border-0",
    "cursor-pointer select-none",
    "transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) ease-(--ease-standard)",
    "active:scale-(--press-scale) active:duration-(--dur-instant)",
    "disabled:pointer-events-none disabled:opacity-38",
  ],
  {
    variants: {
      variant: {
        light: "bg-card text-strong shadow-hairline hover:bg-sunken",
        solid: "bg-inverse text-on-inverse hover:bg-brand-strong",
        brand: "bg-brand text-on-brand shadow-card hover:bg-ink-700 dark:hover:bg-ink-200",
        glass:
          "bg-glass text-on-brand backdrop-blur-(--blur-glass) inset-ring-1 inset-ring-on-brand-border",
        bare: "bg-transparent text-fg hover:bg-sunken",
      },
      // `sm` is 36 px to look light but keeps a 44 px hit area through an invisible halo.
      size: {
        sm: "relative size-9 before:absolute before:-inset-1 before:content-['']",
        md: "size-11",
        lg: "size-13",
      },
    },
    defaultVariants: { variant: "light", size: "md" },
  },
);

const ICON_SIZE = { sm: 16, md: 20, lg: 22 } as const;

export type IconButtonProps = Omit<ComponentPropsWithoutRef<"button">, "color"> &
  VariantProps<typeof iconButtonVariants> & {
    icon: IconName;
    /** Required: an icon-only control has no accessible name without it. */
    label: string;
  };

export const IconButton = ({
  className,
  variant,
  size,
  icon,
  label,
  type = "button",
  ...props
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={cn(iconButtonVariants({ variant, size }), className)}
    {...props}
  >
    <Icon name={icon} size={ICON_SIZE[size ?? "md"]} />
  </button>
);
