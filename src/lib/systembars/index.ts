/**
 * The system-bars layer's public surface: tell the OS status/navigation bar icons which way to
 * lean once the app's resolved theme is known. See `native.ts` for why this needs a plugin at
 * all.
 */
export { nativeSystemBars, type SystemBarsAppearance, type SystemBarsPlugin } from "./native.ts";
