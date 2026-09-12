import type { ReactNode } from "react";
import { BottomSheet } from "../../ds/index.ts";

/**
 * Bottom sheet — the only modal on Android, per the DS.
 *
 * A thin adapter over the design system's `BottomSheet` so callers keep this app's prop shape.
 * The Radix dialog underneath supplies the focus trap, Escape and scroll lock; the grab handle
 * also supports drag-to-dismiss, tracked inside `BottomSheet` itself so it stays next to the
 * focus-management code it has to coexist with.
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
