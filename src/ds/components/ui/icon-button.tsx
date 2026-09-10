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
        solid: "bg-ink-900 text-white hover:bg-ink-700",
        brand: "bg-brand text-white shadow-brand hover:bg-brand-strong",
        glass:
          "bg-glass text-white backdrop-blur-(--blur-glass) inset-ring-1 inset-ring-on-brand-border",
        bare: "bg-transparent text-fg hover:bg-sunken",
      },
      size: { sm: "size-9", md: "size-11", lg: "size-13" },
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
