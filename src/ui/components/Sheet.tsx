import type { ReactNode } from "react";
import { BottomSheet } from "../../ds/index.ts";

/**
 * Bottom sheet — the only modal on Android, per the DS.
 *
 * A thin adapter over the design system's `BottomSheet` so callers keep this app's prop shape.
 * The Radix dialog underneath supplies the focus trap, Escape and scroll lock that the previous
 * hand-rolled version did not have; the scrim tap still dismisses.
 *
 * One affordance was dropped in the swap: drag-to-dismiss. The DS specifies the sheet's motion
 * (spring entrance, 24px translate) and does not include a drag gesture, and re-adding it means
 * putting a motion wrapper between Radix and its content, which is where focus management lives.
 * The grab handle is kept because it reads as "this is a sheet", and Escape plus scrim tap cover
 * dismissal.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: ReactNode;
  children: ReactNode;
}) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={title}
    {...(eyebrow === undefined ? {} : { eyebrow })}
  >
    {children}
  </BottomSheet>
);
