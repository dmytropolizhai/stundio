/**
 * Hybrid CSS sky + 2D Canvas atmospheric backdrop for the Home weather tile.
 *
 * The CSS gradient paints synchronously on first render; the `<canvas>` layers celestial
 * bodies, soft drifting clouds/mist, frost glints, multi-depth precipitation, and storm
 * flashes. The animation loop pauses immediately when `document.hidden`, when `paused` is
 * true (e.g. while the school tile is expanded), or under reduced motion (which draws a
 * single still frame).
 */
import { useEffect, useRef, useState } from "react";
import type { WeatherScene, WeatherSky } from "@/lib/weather";
import {
  createWeatherCanvasState,
  renderWeatherFrame,
  type WeatherCanvasState,
} from "./weather-canvas.ts";

const WEATHER_SKY_GRADIENT: Record<WeatherSky, string> = {
  "clear-day":
    "linear-gradient(175deg, color-mix(in oklab, var(--accent-sky) 80%, var(--accent-sky-ink)) 0%, var(--accent-sky) 52%, color-mix(in oklab, var(--accent-sky) 70%, var(--white)) 100%)",
  "partly-cloudy-day":
    "linear-gradient(175deg, color-mix(in oklab, var(--accent-sky) 84%, var(--accent-sky-ink)) 0%, var(--accent-sky) 56%, color-mix(in oklab, var(--accent-sky) 68%, var(--ink-100)) 100%)",
  "clear-night":
    "linear-gradient(175deg, var(--shade) 0%, var(--ink-900) 42%, color-mix(in oklab, var(--accent-lime) 34%, var(--ink-900)) 100%)",
  "partly-cloudy-night":
    "linear-gradient(175deg, var(--shade) 0%, var(--ink-900) 48%, color-mix(in oklab, var(--ink-700) 58%, var(--accent-sky-ink)) 100%)",
  "cloudy-day":
    "linear-gradient(175deg, color-mix(in oklab, var(--ink-700) 82%, var(--accent-sky-ink)) 0%, color-mix(in oklab, var(--ink-700) 74%, var(--accent-sky)) 58%, color-mix(in oklab, var(--ink-500) 82%, var(--accent-sky)) 100%)",
  "cloudy-night":
    "linear-gradient(175deg, var(--shade) 0%, var(--ink-900) 46%, var(--ink-700) 100%)",
  "fog-day":
    "linear-gradient(175deg, color-mix(in oklab, var(--ink-200) 82%, var(--accent-sky)) 0%, var(--ink-100) 60%, color-mix(in oklab, var(--ink-050) 85%, var(--accent-sky)) 100%)",
  "fog-night":
    "linear-gradient(175deg, var(--ink-900) 0%, var(--ink-700) 58%, color-mix(in oklab, var(--ink-700) 72%, var(--ink-400)) 100%)",
  cold: "linear-gradient(175deg, color-mix(in oklab, var(--accent-sky-ink) 88%, var(--shade)) 0%, var(--accent-sky-ink) 48%, color-mix(in oklab, var(--accent-sky) 36%, var(--accent-sky-ink)) 100%)",
  storm:
    "linear-gradient(175deg, var(--shade) 0%, color-mix(in oklab, var(--ink-900) 80%, var(--accent-sky-ink)) 55%, color-mix(in oklab, var(--ink-900) 66%, var(--accent-lime)) 100%)",
};

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container === null || canvas === null) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (ctx === null) return;

    let state: WeatherCanvasState | null = null;
    let rafId: number | null = null;
    let startMs: number | null = null;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = createWeatherCanvasState(scene, w, h);
      renderWeatherFrame(ctx, state, STATIC_FRAME_TIME_S, reducedMotion);
    };

    resize();

    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            resize();
          })
        : null;
    ro?.observe(container);

    if (!isPaused && !reducedMotion) {
      const tick = (nowMs: number) => {
        if (startMs === null) startMs = nowMs;
        const elapsedS = (nowMs - startMs) / 1000;
        if (state !== null) {
          renderWeatherFrame(ctx, state, STATIC_FRAME_TIME_S + elapsedS, false);
        }
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [scene, isPaused, reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="weather-backdrop"
      data-sky={scene.sky}
      data-precip={scene.precip}
      data-paused={isPaused ? "true" : "false"}
      className="weather-backdrop pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: WEATHER_SKY_GRADIENT[scene.sky] }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
