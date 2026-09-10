import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.ts";

/*
 * Status colour is reserved in this system: `success` / `warning` / `danger` mean sync and lesson
 * state, never decoration. `warning` carries the amber ink pair rather than white, because the DS
 * amber is too light to hold white text at 4.5:1.
 */
const badgeVariants = cva(
  "inline-flex h-[22px] items-center rounded-pill px-[9px] font-text text-micro font-bold",
  {
    variants: {
      tone: {
        brand: "bg-brand text-white",
        ink: "bg-ink-900 text-white",
        success: "bg-success text-white",
        warning: "bg-warning text-amber-ink",
        danger: "bg-danger text-white",
        quiet: "bg-sunken text-muted",
      },
      uppercase: { true: "tracking-label uppercase", false: "tracking-normal normal-case" },
    },
    defaultVariants: { tone: "brand", uppercase: true },
  },
);

export type BadgeProps = ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, tone, uppercase, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tone, uppercase }), className)} {...props} />
);
