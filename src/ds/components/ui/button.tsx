/**
 * Tactile Night / Day pill button — the shared primary action control across Stundio.
 *
 * Honors The Neutral Button Rule (brand is ink: `--bg-inverse` / `--text-on-inverse`, never lamp
 * or electric blue) while upgrading every variant to the Night / Day surface grammar: top-lit
 * specular rims on `primary` / `inverse` / `danger`, frosted translucent `outline`, optical
 * liquid-glass `glass`, and quiet `ghost`. Press is declarative `active:` scaling so a touch
 * interrupted by scroll never sticks.
 */
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-pill font-text font-semibold tracking-[-0.01em]",
    "cursor-pointer border-0 whitespace-nowrap select-none",
    "transition-[background,background-color,color,box-shadow,opacity,transform] duration-(--dur-fast) ease-(--ease-standard)",
    "active:scale-(--press-scale) active:duration-(--dur-instant)",
    "disabled:pointer-events-none disabled:opacity-38",
  ],
  {
    variants: {
      variant: {
        primary: "u-btn-primary",
        inverse: "u-btn-primary",
        outline: "u-btn-outline",
        glass: "u-nav-glass text-strong",
        ghost: "u-btn-ghost",
        onBrand: "u-btn-on-brand",
        danger: "u-btn-danger active:opacity-100",
      },
      size: {
        sm: "h-9 gap-1.5 px-4 text-caption",
        md: "h-11 gap-2 px-5 text-body",
        lg: "h-[54px] gap-2.5 px-6 text-[16px]",
      },
      block: { true: "flex w-full", false: "inline-flex w-auto" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

/** Icon size is tied to the button size, per the DS spec table. */
const ICON_SIZE = { sm: 16, md: 18, lg: 20 } as const;

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "color"> &
  VariantProps<typeof buttonVariants> & {
    icon?: IconName;
    iconEnd?: IconName;
    /** Render as the child element (shadcn `asChild`), e.g. to make a link look like a button. */
    asChild?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  block,
  icon,
  iconEnd,
  asChild = false,
  children,
  type = "button",
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  const glyph = ICON_SIZE[size ?? "md"];
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {icon !== undefined && <Icon name={icon} size={glyph} className="shrink-0" />}
      <Slottable>{children}</Slottable>
      {iconEnd !== undefined && <Icon name={iconEnd} size={glyph} className="shrink-0" />}
    </Comp>
  );
};
