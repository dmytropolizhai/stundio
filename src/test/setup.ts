/**
 * Framer Motion drives real WAAPI animations, which happy-dom cancels on unmount — the
 * rejected cancel surfaces as an unhandled "AbortError" that has nothing to do with the code
 * under test. Skipping animations makes assertions see final values immediately, too.
 */
import { MotionGlobalConfig } from "framer-motion";

MotionGlobalConfig.skipAnimations = true;

/**
 * `useUpdateCheck` calls the real `fetch` (GitHub's API needs no EduPage-style proxy), which
 * would otherwise leave a real network request in flight past test teardown. CLAUDE.md: tests
 * never touch the network — `checkForUpdate` treats a rejection as "nothing to report".
 */
globalThis.fetch = () => Promise.reject(new Error("network disabled in tests"));
