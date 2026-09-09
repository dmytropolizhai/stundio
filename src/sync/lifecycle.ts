/**
 * When to refresh (PLAN.md Phase 2): app open, resume from background, pull-to-refresh.
 * Explicitly NOT on a timer — CLAUDE.md forbids polling.
 *
 * Capacitor's `App` plugin is imported here rather than in the engine so the engine stays
 * testable in plain Node.
 */
import { App } from "@capacitor/app";

/** Minimum gap between resume-triggered refreshes; tab-switching should not spam the school. */
export const RESUME_THROTTLE_MS = 60_000;

export type LifecycleDeps = {
  refresh: () => void | Promise<void>;
  now?: () => number;
  throttleMs?: number;
};

/**
 * Registers a resume listener. Returns a disposer — call it on unmount so React StrictMode's
 * double-invoke does not leave two listeners attached.
 */
export const watchAppResume = ({
  refresh,
  now = () => Date.now(),
  throttleMs = RESUME_THROTTLE_MS,
}: LifecycleDeps): (() => void) => {
  // -Infinity, not 0: the first resume must always fire, whatever the clock reads.
  let lastRun = Number.NEGATIVE_INFINITY;
  let disposed = false;

  const handle = App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive || disposed) return;
    const at = now();
    if (at - lastRun < throttleMs) return;
    lastRun = at;
    void refresh();
  });

  return () => {
    disposed = true;
    void handle.then((h) => h.remove());
  };
};
