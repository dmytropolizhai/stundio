/**
 * Hybrid CSS sky + 2D Canvas atmospheric backdrop for the Home weather tile.
 *
 * The CSS gradient paints synchronously on first render; the `<canvas>` layers celestial
 * bodies, soft drifting clouds/mist, frost glints, multi-depth precipitation, and storm
 * flashes. The canvas lives inside a right-anchored `100cqw` stage matching the full
 * expanded tile row width, so expanding or collapsing the tile clips and reveals a
 * continuous sky without resizing, stretching, or resetting the animation clock. The
 * animation loop pauses immediately when `document.hidden`, when `paused` is true (e.g.
 * while the school tile is expanded), or under reduced motion (single still frame).
 */
import { useEffect, useRef, useState } from "react";
import type { WeatherScene } from "@/lib/weather";
import {
  createWeatherCanvasState,
  renderWeatherFrame,
  WEATHER_SKY_GRADIENT,
  type WeatherCanvasState,
} from "./weather-canvas.ts";

const STATIC_FRAME_TIME_S = 4.2;

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

type WeatherBackdropProps = {
  scene: WeatherScene;
  /** True while the weather tile is collapsed out of view (school tile expanded). */
  paused?: boolean;
};

export const WeatherBackdrop = ({ scene, paused = false }: WeatherBackdropProps) => {
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  const isPaused = paused || pageHidden;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<WeatherCanvasState | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number; scene: WeatherScene } | null>(null);
  const elapsedSRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

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
      if (
        prev !== null &&
        prev.w === w &&
        prev.h === h &&
        prev.dpr === dpr &&
        prev.scene === scene
      ) {
        return;
      }
      sizeRef.current = { w, h, dpr, scene };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current = createWeatherCanvasState(scene, w, h);
      const frameTime = reducedMotionRef.current
        ? STATIC_FRAME_TIME_S
        : STATIC_FRAME_TIME_S + elapsedSRef.current;
      renderWeatherFrame(ctx, stateRef.current, frameTime, reducedMotionRef.current);
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
  }, [scene]);

  useEffect(() => {
    if (reducedMotion) {
      if (ctxRef.current !== null && stateRef.current !== null) {
        renderWeatherFrame(ctxRef.current, stateRef.current, STATIC_FRAME_TIME_S, true);
      }
      return;
    }

    if (isPaused) return;

    let rafId: number | null = null;
    let lastMs: number | null = null;

    const tick = (nowMs: number) => {
      if (lastMs !== null) {
        elapsedSRef.current += Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000));
      }
      lastMs = nowMs;
      if (ctxRef.current !== null && stateRef.current !== null) {
        renderWeatherFrame(
          ctxRef.current,
          stateRef.current,
          STATIC_FRAME_TIME_S + elapsedSRef.current,
          false,
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
      data-testid="weather-backdrop"
      data-sky={scene.sky}
      data-precip={scene.precip}
      data-paused={isPaused ? "true" : "false"}
      className="weather-backdrop pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: WEATHER_SKY_GRADIENT[scene.sky] }}
    >
      <div
        ref={stageRef}
        data-testid="weather-backdrop-stage"
        className="absolute top-0 right-0 h-full w-[100cqw] min-w-full"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  );
};
