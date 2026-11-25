/**
 * Full-screen ambient weather atmosphere rendered behind the Home screen while the weather tile
 * is expanded.
 *
 * Reuses the tile's sky gradient and 2D Canvas atmospheric renderer (clouds, rain, snow, fog,
 * stars/moon, sun shafts, frost, storm glow) at a soft opacity with a downward fade mask so
 * cards and lesson copy stay legible in both Day and Night themes. Stays unmounted until the
 * tile is first expanded and pauses its animation loop as soon as the collapse fade finishes,
 * costing zero CPU/GPU at rest.
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
const FADE_OUT_MS = 400;

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

type WeatherAmbientProps = {
  scene: WeatherScene;
  /** True while the weather tile is expanded. */
  active: boolean;
};

export const WeatherAmbient = ({ scene, active }: WeatherAmbientProps) => {
  const [awake, setAwake] = useState(active);
  const [animating, setAnimating] = useState(active);

  if (active && (!awake || !animating)) {
    setAwake(true);
    setAnimating(true);
  }

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (active) {
      document.documentElement.dataset.weatherAmbient = "true";
    } else {
      delete document.documentElement.dataset.weatherAmbient;
    }
    return () => {
      delete document.documentElement.dataset.weatherAmbient;
    };
  }, [active]);

  useEffect(() => {
    if (active) return;
    const timer = window.setTimeout(() => {
      setAnimating(false);
    }, FADE_OUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [active]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<WeatherCanvasState | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number; scene: WeatherScene } | null>(null);
  const elapsedSRef = useRef(0);

  useEffect(() => {
    if (!awake) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container === null || canvas === null) return;

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
      const rect = container.getBoundingClientRect();
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
      const reduced = readReducedMotion();
      renderWeatherFrame(
        ctx,
        stateRef.current,
        reduced ? STATIC_FRAME_TIME_S : STATIC_FRAME_TIME_S + elapsedSRef.current,
        reduced,
      );
    };

    syncSize();

    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            syncSize();
          })
        : null;
    ro?.observe(container);

    return () => {
      ro?.disconnect();
    };
  }, [awake, scene]);

  useEffect(() => {
    if (!awake || !animating) return;
    if (readReducedMotion()) {
      if (ctxRef.current !== null && stateRef.current !== null) {
        renderWeatherFrame(ctxRef.current, stateRef.current, STATIC_FRAME_TIME_S, true);
      }
      return;
    }

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
  }, [awake, animating]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="weather-ambient"
      data-active={active ? "true" : "false"}
      data-sky={scene.sky}
      data-precip={scene.precip}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-(--dur-slow) ease-(--ease-standard)"
      style={{
        opacity: active ? 0.44 : 0,
        background: WEATHER_SKY_GRADIENT[scene.sky],
        maskImage:
          "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.78) 54%, rgba(0, 0, 0, 0.24) 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.78) 54%, rgba(0, 0, 0, 0.24) 100%)",
      }}
    >
      {awake && <canvas ref={canvasRef} className="block h-full w-full" />}
    </div>
  );
};
