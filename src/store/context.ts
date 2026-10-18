/**
 * The context object and the hook that reads it. Split out of `provider.tsx` so that file
 * exports only components and keeps React Fast Refresh working.
 */
import { createContext, useCallback, useContext } from "react";
import { useStore } from "zustand";
import type { Settings } from "@/db";
import type { createAppStore, AppState, SettingsPatch } from "./useAppStore.ts";

export type Store = ReturnType<typeof createAppStore>;

export const StoreContext = createContext<Store | null>(null);

/** Only valid inside `AppStoreProvider`, which does not render children until it is ready. */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (store === null) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return useStore(store, selector);
}

/**
 * A setter for one plain setting, for a toggle or a picker to call with just the new value.
 * Stable across renders, so it is safe in effect dependency lists.
 */
export function useSettingSetter<K extends keyof SettingsPatch>(
  key: K,
): (value: Settings[K]) => Promise<void> {
  const updateSettings = useAppStore((s) => s.updateSettings);
  return useCallback(
    (value) => {
      const patch: SettingsPatch = {};
      patch[key] = value;
      return updateSettings(patch);
    },
    [updateSettings, key],
  );
}
