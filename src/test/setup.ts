/**
 * Framer Motion drives real WAAPI animations, which happy-dom cancels on unmount — the
 * rejected cancel surfaces as an unhandled "AbortError" that has nothing to do with the code
 * under test. Skipping animations makes assertions see final values immediately, too.
 */
import { MotionGlobalConfig } from "framer-motion";

MotionGlobalConfig.skipAnimations = true;
