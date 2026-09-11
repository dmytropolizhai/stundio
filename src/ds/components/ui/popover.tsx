import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.ts";

/**
 * A non-modal anchored panel — the calendar's "anchor down" affordance, and anything else that
 * points back at the control that opened it rather than interrupting the screen.
 *
 * Deliberately not `BottomSheet`: the DS reserves the scrim-and-slide-up treatment for the one
 * thing it calls a modal. A popover traps no focus and dims nothing behind it, so it sits
 * alongside the sheet rather than duplicating it — Radix still gives it Escape-to-close,
 * outside-click-to-close and return-focus-to-trigger for free.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

export const PopoverContent = ({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: PopoverContentProps) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-40 w-max animate-popover-in rounded-2xl bg-card p-4 shadow-raised",
        "outline-hidden",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
);
