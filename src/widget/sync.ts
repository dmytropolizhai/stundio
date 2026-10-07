/**
 * The widget refresh button's JS half. Tapping it boots the app in an invisible Android window
 * (`WidgetSyncActivity`); this waits for the boot's own refresh, publishes the result
 * unconditionally and then closes that window. Unconditionally, because `wireWidget`'s
 * fingerprint skips an unchanged payload — and "nothing changed" is exactly the answer the
 * user tapped to get, along with a fresh "updated" time.
 */
import { nativeWidgetSync, type WidgetSyncBridge } from "@/lib/widget";
import type { Store } from "@/store";
import { publishWidget, type WidgetPublisher } from "./wire.ts";

export const runWidgetSync = async (
  store: Store,
  refresh: Promise<void>,
  bridge: WidgetSyncBridge | null = nativeWidgetSync(),
  publish?: WidgetPublisher,
): Promise<void> => {
  if (bridge === null || !(await bridge.isRequested())) return;
  try {
    await refresh;
    await publishWidget(store, publish);
  } finally {
    // Close the window even when the sync failed — the tile redraws from cache either way.
    await bridge.finish();
  }
};
