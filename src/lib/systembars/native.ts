/**
 * The one file in `lib/systembars/` allowed to touch Capacitor (mirrors `lib/share/native.ts`).
 *
 * Android has no notion of the app's *setting* (system/light/dark — `src/ui/theme/useTheme.ts`),
 * only the system's own dark mode, which `styles.xml`'s `-night` split guesses at launch time.
 * `SystemBarsPlugin`
 * (`android/app/src/main/java/com/dmytropolizhai/stundio/SystemBarsPlugin.java`) is this app's
 * own plugin that repaints the status/navigation bar icon colour once the resolved theme is
 * known, and again on every change — bar *background* stays untouched; `styles.xml` already made
 * both bars transparent so the WebView's own themed background shows through them.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type SystemBarsAppearance = "light" | "dark";

export type SystemBarsPlugin = {
  setAppearance(options: { style: SystemBarsAppearance }): Promise<void>;
};

const SystemBars = registerPlugin<SystemBarsPlugin>("SystemBars");

/** Android only — the plugin is this app's own, and there is no iOS target. */
export const nativeSystemBars = (): ((appearance: SystemBarsAppearance) => Promise<void>) | null =>
  Capacitor.getPlatform() === "android"
    ? (appearance) => SystemBars.setAppearance({ style: appearance })
    : null;
