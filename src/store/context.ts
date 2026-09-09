/**
 * The context object and the hook that reads it. Split out of `provider.tsx` so that file
 * exports only components and keeps React Fast Refresh working.
 */
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { createAppStore, AppState } from "./useAppStore.ts";

export type Store = ReturnType<typeof createAppStore>;

export const StoreContext = createContext<Store | null>(null);

/** Only valid inside `AppStoreProvider`, which does not render children until it is ready. */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (store === null) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return useStore(store, selector);
}
