import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const THRESHOLD = 72;
/** Resistance: the finger travels ~2.5x further than the indicator, which feels native. */
const DAMPING = 0.4;

/**
 * Pull-to-refresh for the day and week screens. Hand-rolled because the browser's own
 * gesture is disabled (`overscroll-behavior-y: none` in `index.css`) — inside a Capacitor
 * WebView it drags the whole page and looks broken.
 *
 * Only arms when the scroller is already at the top, so it never fights a normal scroll.
 */
export const PullToRefresh = ({
  onRefresh,
  refreshing,
  label,
  releaseLabel,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  refreshing: boolean;
  label: string;
  releaseLabel: string;
  children: ReactNode;
}) => {
  const scroller = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);

  const armed = pull >= THRESHOLD;

  const onTouchStart = (e: React.TouchEvent) => {
    if ((scroller.current?.scrollTop ?? 0) > 0 || refreshing) return;
    startY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
    // An upward drag is a normal scroll; hand it back rather than swallowing it.
    if (delta <= 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    setPull(Math.min(THRESHOLD * 1.6, delta * DAMPING));
  };

  const onTouchEnd = () => {
    if (startY.current !== null && pull >= THRESHOLD) void onRefresh();
    startY.current = null;
    setPull(0);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        animate={{ y: refreshing ? 12 : pull - 8, opacity: refreshing || pull > 8 ? 1 : 0 }}
        transition={{ duration: 0.12 }}
      >
        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow dark:bg-slate-800 dark:text-slate-400">
          {refreshing ? "…" : armed ? releaseLabel : label}
        </span>
      </motion.div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        data-testid="scroller"
      >
        <motion.div animate={{ y: pull }} transition={{ duration: 0.12 }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
};
