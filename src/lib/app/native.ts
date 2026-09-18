/**
 * The one file in `lib/app/` allowed to touch Capacitor (mirrors `lib/network/native.ts`).
 *
 * Capacitor's `App` plugin provides Android hardware/gesture back button events and app
 * minimization/exit controls. Wrapping it behind `AppPort` keeps the rest of the application
 * testable without a browser or device.
 */
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export type AppPort = {
  /**
   * Registers a hardware/gesture back button listener on Android.
   * Returns a disposer function to remove the listener.
   */
  addBackButtonListener: (listener: () => void) => () => void;
  /** Minimizes the app to the background on Android (preserves warm process state). */
  minimizeApp: () => Promise<void>;
  /** Exits the app activity completely on Android. */
  exitApp: () => Promise<void>;
};

export const nativeApp: AppPort = {
  addBackButtonListener: (listener) => {
    if (Capacitor.getPlatform() !== "android") {
      return () => undefined;
    }
    const handle = App.addListener("backButton", () => {
      listener();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  },
  minimizeApp: async () => {
    if (Capacitor.getPlatform() === "android") {
      await App.minimizeApp();
    }
  },
  exitApp: async () => {
    if (Capacitor.getPlatform() === "android") {
      await App.exitApp();
    }
  },
};
