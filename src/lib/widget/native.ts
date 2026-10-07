/**
 * The one file in `lib/widget/` allowed to touch Capacitor (mirrors `lib/share/native.ts`).
 *
 * The payload goes over the bridge as a JSON string rather than a plugin object: the widget
 * reads it back from `SharedPreferences` long after the WebView is gone, so it has to be
 * stored as one opaque blob anyway, and a string keeps the native side from developing
 * opinions about the fields.
 *
 * The reason this is a plugin at all — instead of `@capacitor/preferences` — is the second
 * half of `publish`: `StundioWidgetPlugin` pokes `AppWidgetManager` after writing, so the
 * home screen redraws the moment a sync finishes instead of at the next 30-minute tick.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { WidgetPayload } from "./types.ts";

export type StundioWidgetPlugin = {
  /** Stores `payload` (a JSON string) and immediately re-renders every placed widget. */
  publish(options: { payload: string }): Promise<void>;
  /** Whether this launch came from the widget's refresh button (an invisible host window). */
  isSyncRequest(): Promise<{ requested: boolean }>;
  /** Closes that invisible window. A no-op in the normal app. */
  finishSync(): Promise<void>;
};

const StundioWidget = registerPlugin<StundioWidgetPlugin>("StundioWidget");

/**
 * Android only — the plugin is this app's own, and a browser has no home screen to draw on.
 * Returns null elsewhere so callers can stay unconditional.
 */
export const nativeWidget = (): ((payload: WidgetPayload) => Promise<void>) | null =>
  Capacitor.getPlatform() === "android"
    ? (payload) => StundioWidget.publish({ payload: JSON.stringify(payload) })
    : null;

export type WidgetSyncBridge = {
  isRequested: () => Promise<boolean>;
  finish: () => Promise<void>;
};

/**
 * The widget refresh button's side of the bridge: the tap boots the app in an invisible
 * window, and JS has to know that (to close it again once the fresh payload is published).
 * Android only, like `nativeWidget`.
 */
export const nativeWidgetSync = (): WidgetSyncBridge | null =>
  Capacitor.getPlatform() === "android"
    ? {
        isRequested: async () => (await StundioWidget.isSyncRequest()).requested,
        finish: () => StundioWidget.finishSync(),
      }
    : null;
