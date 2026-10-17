/**
 * When to refresh (PLAN.md Phase 2): app open, resume from background, pull-to-refresh. Also:
 * when to say "offline" without waiting for a fetch to time out (PLAN.md Phase 4). Explicitly
 * not on a timer — CLAUDE.md forbids polling; both of these are push-driven OS events.
 *
 * Capacitor's `App` plugin is imported here rather than in the engine so the engine stays
 * testable in plain Node. `watchConnectivity` takes a `NetworkPort` instead of importing
 * `@capacitor/network` itself — that import is isolated to `lib/network/native.ts` (CLAUDE.md).
 */
import { App } from "@capacitor/app";
import { onDesktopFocus } from "@/lib/desktop";
import { currentPlatform } from "@/lib/platform";
import type { NetworkPort } from "@/lib/network";

/** Minimum gap between resume-triggered refreshes; tab-switching should not spam the school. */
export const RESUME_THROTTLE_MS = 60_000;

export type LifecycleDeps = {
  refresh: () => void | Promise<void>;
  now?: () => number;
  throttleMs?: number;
};

/** The shell's "the app is in front again" signal: Capacitor's resume, or window focus on Linux. */
const onAppActive = (listener: () => void): (() => void) => {
  if (currentPlatform() === "desktop") return onDesktopFocus(listener);
  const handle = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) listener();
  });
  return () => {
    void handle.then((h) => h.remove());
  };
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

  const stopListening = onAppActive(() => {
    if (disposed) return;
    const at = now();
    if (at - lastRun < throttleMs) return;
    lastRun = at;
    void refresh();
  });

  return () => {
    disposed = true;
    stopListening();
  };
};

export type ConnectivityDeps = {
  network: NetworkPort;
  /**
   * Called with the current connectivity — once immediately (there may already be no network
   * by the time the app opens, and nothing else will say so until a fetch is attempted) and
   * again on every change. What happens with `online` — fold it into `SyncStatus`, trigger a
   * refresh — is the caller's call; this function only relays the device's own signal.
   */
  onChange: (online: boolean) => void;
};

/**
 * Registers a connectivity listener. Returns a disposer, same contract as `watchAppResume`.
 */
export const watchConnectivity = ({ network, onChange }: ConnectivityDeps): (() => void) => {
  const dispose = network.onChange(onChange);
  void network.isOnline().then(onChange);
  return dispose;
};
