/**
 * App lifecycle and hardware integration as a plain, injectable port (CLAUDE.md) —
 * `nativeApp` is the only thing that touches `@capacitor/app` for app exit and back button events.
 */
export { nativeApp, type AppPort } from "./native.ts";
