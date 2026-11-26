import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import { cn } from "../../lib/utils.ts";

/** Downward drag past this fraction of the sheet's own height dismisses it. */
const DISMISS_HEIGHT_FRACTION = 0.3;

export type BottomSheetProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Optional leading element aligned beside the header title block (e.g. a period jewel). */
  leading?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Optional class override for `Dialog.Title` (e.g. compact `text-title` for long subjects). */
  titleClassName?: string | undefined;
  style?: CSSProperties | undefined;
  /** Accessible name when `title` is absent or not a plain string. */
  label?: string;
  /** Localized accessible label for the top-right dismiss button. */
  closeLabel?: string | undefined;
};

/**
 * The only modal on Android — the DS deliberately ships no Dialog, Toast or Tooltip.
 *
 * Built on Radix Dialog rather than the DS's hand-rolled overlay: the published component is a
 * bare div that traps neither focus nor Escape and lets the page behind it scroll. Radix gives
 * the focus trap, Escape, scroll lock and `aria-modal` for free; the DS styling is unchanged.
 *
 * The scrim is the second (and last) place the DS permits blur: navy 56% over an 8px blur.
 *
 * The sheet caps itself at the visible viewport minus the top safe-area inset and scrolls its
 * own body: anchored to `bottom: 0`, content taller than the screen would otherwise grow upward
 * over the header and carry the grab handle, title and close button off the top — where nothing
 * can reach them. Callers pass their content plain; the scroll region is this component's job.
 */
export const BottomSheet = ({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  leading,
  children,
  footer,
  className,
  titleClassName,
  style,
  label,
  closeLabel = "Close",
}: BottomSheetProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; height: number } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const endDrag = (dismiss: boolean) => {
    dragState.current = null;
    setIsDragging(false);
    setDragY(0);
    if (dismiss) onClose?.();
  };

  const handleDragStart = (event: React.PointerEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, select, textarea, [role='button']") !== null
    ) {
      return;
    }
    const height = contentRef.current?.getBoundingClientRect().height ?? 0;
    dragState.current = { startY: event.clientY, height };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: React.PointerEvent) => {
    if (dragState.current === null) return;
    const delta = event.clientY - dragState.current.startY;
    setDragY(Math.max(0, delta));
  };

  const handleDragEnd = () => {
    if (dragState.current === null) return;
    const { height } = dragState.current;
    const dismiss = height > 0 && dragY > height * DISMISS_HEIGHT_FRACTION;
    endDrag(dismiss);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-scrim-in bg-overlay backdrop-blur-(--blur-scrim)" />
        <Dialog.Content
          ref={contentRef}
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 animate-sheet-in",
            "rounded-t-2xl bg-card px-5 pt-2.5 shadow-raised",
            "pb-[calc(--spacing(6)+var(--app-inset-bottom))]",
            // Wide layouts widen the screen column; a sheet stays readable rather than following,
            // and offsets by the rail width so mx-auto centers it against the content column.
            "mx-auto w-full max-w-screen tablet:left-21 tablet:max-w-[560px] desktop:left-58",
            "flex flex-col",
            "max-h-[calc(var(--app-viewport-height)-var(--app-inset-top)-12px)]",
            !isDragging && "transition-transform",
            className,
          )}
          style={dragY > 0 ? { ...style, transform: `translateY(${String(dragY)}px)` } : style}
        >
          {/* Non-scrolling drag zone: full-width 44px grab bar + header for one-handed swipe dismiss. */}
          <div
            data-testid="sheet-drag-zone"
            className="shrink-0 touch-none"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div
              aria-hidden="true"
              className="-mt-2.5 flex min-h-11 w-full cursor-grab items-center justify-center active:cursor-grabbing"
            >
              <span className="h-1 w-11 rounded-pill bg-strong/20" />
            </div>
            <div className="mb-3.5 flex items-start gap-3">
              {leading !== undefined && <div className="shrink-0 pt-0.5">{leading}</div>}
              <div className="min-w-0 flex-1">
                {eyebrow !== undefined && <div className="u-eyebrow">{eyebrow}</div>}
                <Dialog.Title
                  className={cn(
                    "m-0 font-display text-display-2 tracking-display text-strong",
                    titleClassName,
                    title === undefined && "sr-only",
                  )}
                >
                  {title ?? label ?? "Details"}
                </Dialog.Title>
                {subtitle !== undefined && (
                  <div className="mt-1 font-text text-body text-muted">{subtitle}</div>
                )}
              </div>
              {onClose !== undefined && (
                <Dialog.Close asChild>
                  <IconButton
                    icon="x"
                    label={closeLabel}
                    variant="bare"
                    size="md"
                    className="-mr-2 -mt-1.5"
                  />
                </Dialog.Close>
              )}
            </div>
          </div>
          {/* Negative margin + matching padding so a focus ring at the edge is not clipped. */}
          <div className="no-scrollbar -mx-5 min-h-0 overflow-y-auto overscroll-contain px-5">
            {children}
          </div>
          {footer !== undefined && <div className="mt-4.5 shrink-0">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
