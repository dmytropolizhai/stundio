import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.ts";

/*
 * Status colour is reserved in this system: `success` / `warning` / `danger` mean sync and lesson
 * state, never decoration. `warning` (straw caution) carries its own dark ink, kept apart from `lamp` amber, which
 * means only "on now" and is never a status.
 */
const badgeVariants = cva(
  "inline-flex h-[22px] items-center rounded-pill px-[9px] font-text text-micro font-bold",
  {
    variants: {
      tone: {
        brand: "bg-brand text-on-brand",
        ink: "bg-inverse text-on-inverse",
        lamp: "bg-lamp text-lamp-ink",
        success: "bg-success text-on-inverse",
        warning: "bg-warning text-caution-ink",
        danger: "bg-danger text-on-danger",
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
