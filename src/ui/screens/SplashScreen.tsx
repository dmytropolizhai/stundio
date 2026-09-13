/**
 * The loading screen: the brand mark, centered, filling with a wave while the app boots.
 *
 * It renders as a full-bleed overlay rather than as the store provider's `fallback`, because
 * the exit is part of the animation — the wave has to top out and the screen has to fade
 * *after* boot reports ready, which a fallback that unmounts the instant the store lands
 * cannot do. `ready` starts the exit; the component removes itself when the fade is over.
 *
 * The fill deliberately does not claim to be progress. Boot is cache-first and usually takes
 * one frame, so a truthful 0–100 bar would be a flicker. Instead the wave rises to a hold
 * level and ripples there for as long as boot actually takes, then tops out on `ready`.
 */
import { useEffect, useState } from "react";
import { WaveMark } from "../components/WaveMark.tsx";

/** Where the wave parks while boot is still running. Never 100 — that would read as done. */
const HOLD_LEVEL = 90;
/** The rise. Must match the `duration-*` on `WaveMark`'s lift. */
const RISE_MS = 900;
/** Time the topped-out mark stays on screen before the fade starts. */
const TOP_OUT_MS = 340;
/** Fade-out duration; must match `duration-*` on the root below. */
const FADE_MS = 260;

export type SplashScreenProps = {
  /** Flips to true when the app behind the splash is ready to be seen. */
  ready: boolean;
};

export const SplashScreen = ({ ready }: SplashScreenProps) => {
  // Starts empty and rises on the first commit, so the transition has two values to move
  // between — mounting straight at HOLD_LEVEL would just paint a full mark with no rise.
  const [level, setLevel] = useState(0);
  // Boot is cache-first and frequently resolves inside the first few frames. Without a floor
  // the splash would top out before the wave had visibly moved — a flash, not an animation.
  // The rise is therefore allowed to finish before `ready` is acted on.
  const [risen, setRisen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setLevel(HOLD_LEVEL);
    });
    const full = setTimeout(() => {
      setRisen(true);
    }, RISE_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(full);
    };
  }, []);

  useEffect(() => {
    if (!ready || !risen) return;
    setLevel(104);
    const fade = setTimeout(() => {
      setLeaving(true);
    }, TOP_OUT_MS);
    const done = setTimeout(() => {
      setGone(true);
    }, TOP_OUT_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [ready, risen]);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-label="Stundio"
      data-testid="splash"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-app transition-opacity duration-[260ms] ease-[var(--ease-standard)] motion-reduce:transition-none ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <WaveMark level={level} />
    </div>
  );
};
