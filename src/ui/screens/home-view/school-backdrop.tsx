/**
 * Hybrid CSS vessel + 2D Canvas rising fluid backdrop for the Home school tile.
 *
 * The CSS gradient paints the unfilled upper vessel synchronously on first render; the `<canvas>`
 * renders the rising liquid surface inside a left-anchored `100cqw` stage matching the full
 * expanded tile row width, so expanding or collapsing the tile clips and reveals a continuous
 * tank without stretching, resizing, or resetting the wave phase. Tapping the tile injects a
 * subtle damped slosh impulse. The animation loop pauses immediately when `document.hidden`,
 * when `paused` is true (e.g. while the weather tile is expanded), or under reduced motion
 * (single still frame at the exact current fill level).
 */
import { useEffect, useRef, useState } from "react";
import { subscribeDeviceTilt } from "./device-tilt.ts";
import {
  createSchoolFluidState,
  renderSchoolFluidFrame,
  triggerSchoolFluidSlosh,
  type SchoolFluidState,
  type SchoolFluidTone,
} from "./school-fluid-canvas.ts";

const VESSEL_GRADIENT: Record<SchoolFluidTone, string> = {
  ongoing:
    "linear-gradient(175deg, color-mix(in oklab, var(--lamp) 26%, var(--ink-050)) 0%, color-mix(in oklab, var(--lamp) 40%, var(--ink-050)) 100%)",
  ahead:
    "linear-gradient(175deg, color-mix(in oklab, var(--lamp) 38%, var(--accent-sky)) 0%, color-mix(in oklab, var(--lamp) 52%, var(--accent-sky)) 100%)",
};

const STATIC_FRAME_TIME_S = 2.8;

const usePageHidden = (): boolean => {
  const [hidden, setHidden] = useState(() =>
    typeof document === "undefined" ? false : document.hidden,
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      setHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return hidden;
};

const readReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const cls =
    typeof document !== "undefined" && document.documentElement.classList.contains("reduce-motion");
  return media || cls;
};

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(readReducedMotion);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setReduced(readReducedMotion());
    };
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    mq?.addEventListener("change", update);
    const observer =
      typeof MutationObserver === "function" && typeof document !== "undefined"
        ? new MutationObserver(update)
        : null;
    if (observer !== null) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    return () => {
      mq?.removeEventListener("change", update);
      observer?.disconnect();
    };
  }, []);
  return reduced;
};

type SchoolBackdropProps = {
  tone: SchoolFluidTone;
  /** Fraction of the school day elapsed (`0..1`). */
  progress: number;
  /** True while the school tile is expanded across the row. */
  expanded: boolean;
  /** True while the school tile is collapsed out of view (weather tile expanded). */
  paused?: boolean;
};

export const SchoolBackdrop = ({
  tone,
  progress,
  expanded,
  paused = false,
}: SchoolBackdropProps) => {
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  const isPaused = paused || pageHidden;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<SchoolFluidState | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number; tone: SchoolFluidTone } | null>(null);
  const elapsedSRef = useRef(0);
  const progressRef = useRef(progress);
  const prevProgressRef = useRef(progress);
  const expandedRef = useRef(expanded);
  const prevExpandedRef = useRef(expanded);
  const targetTiltRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);

  progressRef.current = progress;
  expandedRef.current = expanded;
  reducedMotionRef.current = reducedMotion;

  // Attach device tilt sensor only while actively visible and motion is allowed.
  useEffect(() => {
    if (isPaused || reducedMotion) {
      targetTiltRef.current = 0;
      return;
    }
    return subscribeDeviceTilt((angle) => {
      targetTiltRef.current = angle;
    });
  }, [isPaused, reducedMotion]);

  // Inject a gentle slosh impulse when the tile expands/collapses or the minute ticks up.
  useEffect(() => {
    if (prevExpandedRef.current !== expanded) {
      prevExpandedRef.current = expanded;
      if (!reducedMotionRef.current && stateRef.current !== null) {
        triggerSchoolFluidSlosh(stateRef.current, expanded ? 1 : -1, 0.85);
      }
    }
  }, [expanded]);

  useEffect(() => {
    const delta = progress - prevProgressRef.current;
    prevProgressRef.current = progress;
    if (Math.abs(delta) > 0.001 && stateRef.current !== null) {
      if (reducedMotionRef.current) {
        if (ctxRef.current !== null) {
          renderSchoolFluidFrame(
            ctxRef.current,
            stateRef.current,
            progress,
            STATIC_FRAME_TIME_S,
            0,
            true,
          );
        }
      } else {
        triggerSchoolFluidSlosh(stateRef.current, delta > 0 ? 1 : -1, 0.38);
      }
    }
  }, [progress]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (stage === null || canvas === null) return;

    let ctx = ctxRef.current;
    if (ctx === null) {
      try {
        ctx = canvas.getContext("2d");
      } catch {
        return;
      }
      if (ctx === null) return;
      ctxRef.current = ctx;
    }

    const syncSize = () => {
      const rect = stage.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const prev = sizeRef.current;
      if (prev !== null && prev.w === w && prev.h === h && prev.dpr === dpr && prev.tone === tone) {
        return;
      }
      const carryFill = stateRef.current?.displayFill ?? progressRef.current;
      sizeRef.current = { w, h, dpr, tone };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current = createSchoolFluidState(tone, w, h, carryFill);
      const frameTime = reducedMotionRef.current
        ? STATIC_FRAME_TIME_S
        : STATIC_FRAME_TIME_S + elapsedSRef.current;
      renderSchoolFluidFrame(
        ctx,
        stateRef.current,
        progressRef.current,
        frameTime,
        0,
        reducedMotionRef.current,
        targetTiltRef.current,
        expandedRef.current,
      );
    };

    syncSize();

    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            syncSize();
          })
        : null;
    ro?.observe(stage);

    return () => {
      ro?.disconnect();
    };
  }, [tone]);

  useEffect(() => {
    if (reducedMotion) {
      if (ctxRef.current !== null && stateRef.current !== null) {
        renderSchoolFluidFrame(
          ctxRef.current,
          stateRef.current,
          progressRef.current,
          STATIC_FRAME_TIME_S,
          0,
          true,
        );
      }
      return;
    }

    if (isPaused) return;

    let rafId: number | null = null;
    let lastMs: number | null = null;

    const tick = (nowMs: number) => {
      const dtS = lastMs === null ? 0 : Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000));
      elapsedSRef.current += dtS;
      lastMs = nowMs;
      if (ctxRef.current !== null && stateRef.current !== null) {
        renderSchoolFluidFrame(
          ctxRef.current,
          stateRef.current,
          progressRef.current,
          STATIC_FRAME_TIME_S + elapsedSRef.current,
          dtS,
          false,
          targetTiltRef.current,
          expandedRef.current,
        );
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [isPaused, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      data-testid="school-backdrop"
      data-tone={tone}
      data-fill={String(Math.round(Math.min(1, Math.max(0, progress)) * 100))}
      data-paused={isPaused ? "true" : "false"}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: VESSEL_GRADIENT[tone] }}
    >
      <div
        ref={stageRef}
        data-testid="school-backdrop-stage"
        className="absolute top-0 left-0 h-full w-[100cqw] min-w-full"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  );
};
