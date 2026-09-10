/**
 * Wires the store to the real cache and sync engine, and owns the two refresh triggers that
 * are not user-initiated: first mount, and resume from background (PLAN.md Phase 2).
 * Pull-to-refresh calls `refresh({ force: true })` from the UI.
 */
import { useEffect, useState, type ReactNode } from "react";
import { StoreContext, type Store } from "./context.ts";
import { bootApp, type Boot } from "./boot.ts";

export type AppStoreProviderProps = {
  children: ReactNode;
  /** Shown for the frame(s) it takes to open the cache and hydrate. */
  fallback?: ReactNode;
  /** Rendered instead of `fallback` when boot fails outright. */
  errorFallback?: (error: Error) => ReactNode;
  /** Injected by tests; production uses `bootApp`. */
  boot?: Boot;
};

const describe = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)));

export const AppStoreProvider = ({
  children,
  fallback = null,
  errorFallback,
  boot = bootApp,
}: AppStoreProviderProps) => {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // No "boot only once" guard here. React's contract is that an effect must survive being
    // torn down and re-run — which StrictMode does in dev — and a guard that skips the second
    // run while the first run's cleanup has already flagged itself cancelled leaves the store
    // permanently null and the app stuck on `fallback`. Booting per effect run is the
    // intended shape: the extra dev boot is cheap (cache-first) and, more importantly, the
    // resume listener is registered and disposed in lockstep with the mount.
    let cancelled = false;
    let dispose: (() => void) | undefined;

    boot().then(
      (booted) => {
        if (cancelled) {
          booted.dispose?.();
          return;
        }
        dispose = booted.dispose;
        setStore(booted.store);
      },
      (err: unknown) => {
        // Without this the app would sit on the splash forever with nothing in the console.
        if (!cancelled) setError(describe(err));
      },
    );

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [boot]);

  if (error !== null) return <>{errorFallback?.(error) ?? fallback}</>;
  if (store === null) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
