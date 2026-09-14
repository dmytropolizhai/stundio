/**
 * Connectivity as a plain, injectable port (CLAUDE.md) — `nativeNetwork` is the only thing that
 * touches `@capacitor/network`; everywhere else takes a `NetworkPort` and stays testable without
 * a device, the same way `sync/` takes `http`, `cache` and a clock.
 */
export { nativeNetwork, type NetworkPort } from "./native.ts";
