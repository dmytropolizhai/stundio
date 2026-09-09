/**
 * Wires the store to the real cache and sync engine, and owns the two refresh triggers that
 * are not user-initiated: first mount, and resume from background (PLAN.md Phase 2).
 * Pull-to-refresh calls `refresh({ force: true })` from the UI in Phase 3.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StoreContext, type Store } from "./context.ts";
import { bootApp, type Boot } from "./boot.ts";

export type AppStoreProviderProps = {
  children: ReactNode;
  /** Shown for the frame(s) it takes to open the cache and hydrate. */
  fallback?: ReactNode;
  /** Injected by tests; production uses `bootApp`. */
  boot?: Boot;
};

export const AppStoreProvider = ({
  children,
  fallback = null,
  boot = bootApp,
}: AppStoreProviderProps) => {
  const [store, setStore] = useState<Store | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode double-invokes effects in dev; only boot once.
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    void boot().then((booted) => {
      if (cancelled) {
        booted.dispose?.();
        return;
      }
      dispose = booted.dispose;
      setStore(booted.store);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [boot]);

  if (store === null) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
