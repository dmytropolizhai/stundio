import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.ts";

export type SkeletonProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  height?: number | string;
  width?: number | string;
  radius?: string;
};

/**
 * Shimmer placeholder.
 *
 * The DS builds the gradient from `--ink-100` → `--ink-200`. Those are base-palette steps and stay
 * light in both themes, so a literal port would flash bright on a dark card. It uses the surface
 * aliases instead, which resolve to exactly those two values in light and to the dark equivalents
 * under `.dark` — same look as designed, correct in both themes.
 */
export const Skeleton = ({
  className,
  height = 16,
  width = "100%",
  radius,
  style,
  ...props
}: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "block animate-shimmer bg-[length:200%_100%]",
      "bg-[linear-gradient(90deg,var(--surface-sunken)_0%,var(--border-hairline)_40%,var(--surface-sunken)_80%)]",
      radius === undefined && "rounded-sm",
      className,
    )}
    style={{ height, width, ...(radius === undefined ? {} : { borderRadius: radius }), ...style }}
    {...props}
  />
);
