import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import { cn } from "../../lib/utils.ts";

export type BottomSheetProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Accessible name when `title` is absent or not a plain string. */
  label?: string;
};

/**
 * The only modal on Android — the DS deliberately ships no Dialog, Toast or Tooltip.
 *
 * Built on Radix Dialog rather than the DS's hand-rolled overlay: the published component is a
 * bare div that traps neither focus nor Escape and lets the page behind it scroll. Radix gives
 * the focus trap, Escape, scroll lock and `aria-modal` for free; the DS styling is unchanged.
 *
 * The scrim is the second (and last) place the DS permits blur: navy 56% over an 8px blur.
 */
export const BottomSheet = ({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  className,
  label,
}: BottomSheetProps) => (
  <Dialog.Root
    open={open}
    onOpenChange={(next) => {
      if (!next) onClose?.();
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 animate-scrim-in bg-overlay backdrop-blur-(--blur-scrim)" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 animate-sheet-in",
          "rounded-t-2xl bg-card px-5 pt-2.5 shadow-raised",
          "pb-[calc(--spacing(6)+var(--app-inset-bottom))]",
          "mx-auto w-full max-w-screen",
          className,
        )}
      >
        {/* Grab handle. Decorative — the close control is the real affordance. */}
        <div aria-hidden="true" className="mx-auto mb-3.5 h-1 w-11 rounded-pill bg-ink-200" />
        <div className="mb-3.5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow !== undefined && <div className="u-eyebrow">{eyebrow}</div>}
            <Dialog.Title
              className={cn(
                "m-0 font-display text-display-2 tracking-display text-strong",
                title === undefined && "sr-only",
              )}
            >
              {title ?? label ?? "Details"}
            </Dialog.Title>
          </div>
          {onClose !== undefined && (
            <Dialog.Close asChild>
              <IconButton icon="x" label="Close" variant="bare" size="sm" />
            </Dialog.Close>
          )}
        </div>
        {children}
        {footer !== undefined && <div className="mt-4.5">{footer}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
