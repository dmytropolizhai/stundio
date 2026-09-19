/** Where the wave parks while boot is still running. Never 100 — that would read as done. */
export const HOLD_LEVEL = 90;

/** The rise. Must match the `duration-*` on `WaveMark`'s lift. */
export const RISE_MS = 900;

/** Time the topped-out mark stays on screen before the fade starts. */
export const TOP_OUT_MS = 340;

/** Fade-out duration; must match `duration-*` on the root below. */
export const FADE_MS = 260;
