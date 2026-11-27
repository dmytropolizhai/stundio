import { createElement, Fragment, useLayoutEffect } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { weatherScene, type WeatherCondition, type WeatherHint } from "@/lib/weather";
import { WeatherAmbient } from "../screens/home-view/weather-ambient.tsx";
import { WeatherBackdrop } from "../screens/home-view/weather-backdrop.tsx";
import {
  createWeatherCanvasState,
  renderWeatherFrame,
} from "../screens/home-view/weather-canvas.ts";

const makeMockContext = () => {
  const grad = { addColorStop: vi.fn() };
  const clearRect = vi.fn();
  const ctx = {
    clearRect,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    createRadialGradient: vi.fn(() => grad),
    createLinearGradient: vi.fn(() => grad),
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
  } as unknown as CanvasRenderingContext2D;
  return { ctx, clearRect };
};

describe("weather-canvas", () => {
  const scenarios: Array<[WeatherCondition, boolean, WeatherHint | null]> = [
    ["clear", true, null],
    ["clear", false, null],
    ["partly-cloudy", true, null],
    ["partly-cloudy", false, null],
    ["cloudy", true, null],
    ["cloudy", false, null],
    ["fog", true, null],
    ["fog", false, null],
    ["drizzle", true, null],
    ["rain", true, null],
    ["snow", true, null],
    ["thunderstorm", false, null],
    ["clear", true, "cold"],
    ["fog", true, "umbrella"],
  ];

  it.each(scenarios)(
    "builds deterministic pools and renders cleanly for %s (isDay=%s, hint=%s)",
    (condition, isDay, hint) => {
      const scene = weatherScene({ condition, isDay, hint });
      const stateA = createWeatherCanvasState(scene, 180, 180);
      const stateB = createWeatherCanvasState(scene, 180, 180);
      expect(stateA).toEqual(stateB);

      const { ctx, clearRect } = makeMockContext();
      // Render at storm-flash peak (5.24s) and secondary flicker (5.47s), plus reduced motion
      renderWeatherFrame(ctx, stateA, 5.24, false);
      renderWeatherFrame(ctx, stateA, 5.47, false);
      renderWeatherFrame(ctx, stateA, 5.24, true);

      expect(clearRect).toHaveBeenCalledTimes(3);
    },
  );

  it("populates expected particle pools per scene feature", () => {
    const night = createWeatherCanvasState(
      weatherScene({ condition: "clear", isDay: false, hint: null }),
      180,
      180,
    );
    expect(night.stars.length).toBeGreaterThan(10);
    expect(night.rain).toHaveLength(0);

    const rain = createWeatherCanvasState(
      weatherScene({ condition: "rain", isDay: true, hint: null }),
      180,
      180,
    );
    expect(rain.rain.length).toBeGreaterThan(20);
    expect(rain.splashes.length).toBeGreaterThan(0);

    const snow = createWeatherCanvasState(
      weatherScene({ condition: "snow", isDay: true, hint: null }),
      180,
      180,
    );
    expect(snow.snow.length).toBeGreaterThan(20);
    expect(snow.iceDust.length).toBeGreaterThan(0);

    const fog = createWeatherCanvasState(
      weatherScene({ condition: "fog", isDay: true, hint: null }),
      180,
      180,
    );
    expect(fog.fog).toHaveLength(4);

    const storm = createWeatherCanvasState(
      weatherScene({ condition: "thunderstorm", isDay: false, hint: null }),
      180,
      180,
    );
    expect(storm.bolt).not.toBeNull();
  });

  it("keeps cloud and fog proportions unstretched on a 2:1 full-row stage", () => {
    const cloudy = weatherScene({ condition: "cloudy", isDay: true, hint: null });
    const square = createWeatherCanvasState(cloudy, 180, 180);
    const wide = createWeatherCanvasState(cloudy, 360, 180);

    expect(wide.clouds.length).toBeGreaterThan(square.clouds.length);
    const maxSquareW = Math.max(...square.clouds.map((c) => c.w));
    const maxWideW = Math.max(...wide.clouds.map((c) => c.w));
    expect(maxWideW).toBeCloseTo(maxSquareW, 1);

    const fog = weatherScene({ condition: "fog", isDay: true, hint: null });
    const squareFog = createWeatherCanvasState(fog, 180, 180);
    const wideFog = createWeatherCanvasState(fog, 360, 180);
    expect(wideFog.fog.length).toBeGreaterThan(squareFog.fog.length);
    expect(Math.max(...wideFog.fog.map((f) => f.w))).toBeCloseTo(
      Math.max(...squareFog.fog.map((f) => f.w)),
      1,
    );

    const { ctx, clearRect } = makeMockContext();
    renderWeatherFrame(ctx, wide, 5.24, false);
    renderWeatherFrame(ctx, wideFog, 5.24, false);
    expect(clearRect).toHaveBeenCalledTimes(2);
  });
});

describe("WeatherBackdrop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anchors the canvas stage at full row width and preserves animation time across pause toggles", () => {
    const { ctx } = makeMockContext();
    (ctx as unknown as { setTransform: ReturnType<typeof vi.fn> }).setTransform = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const scene = weatherScene({ condition: "cloudy", isDay: true, hint: null });
    const { getByTestId, rerender } = render(
      createElement(WeatherBackdrop, { scene, paused: false }),
    );

    const stage = getByTestId("weather-backdrop-stage");
    expect(stage.className).toContain("w-[100cqw]");
    expect(stage.className).toContain("right-0");

    // Advance two frames
    rafCallbacks.shift()?.(1000);
    rafCallbacks.shift()?.(1050);
    const setTransform = (ctx as unknown as { setTransform: ReturnType<typeof vi.fn> })
      .setTransform;
    expect(setTransform).toHaveBeenCalledTimes(1);

    // Pause (school tile expanded) then resume — canvas state is not recreated
    rerender(createElement(WeatherBackdrop, { scene, paused: true }));
    expect(getByTestId("weather-backdrop").getAttribute("data-paused")).toBe("true");

    rerender(createElement(WeatherBackdrop, { scene, paused: false }));
    expect(getByTestId("weather-backdrop").getAttribute("data-paused")).toBe("false");
    expect(setTransform).toHaveBeenCalledTimes(1);
  });
});

describe("reduced motion from the app setting", () => {
  afterEach(() => {
    document.documentElement.classList.remove("reduce-motion");
    vi.restoreAllMocks();
  });

  /* Settings hydrate after Home mounts: the class can land between the first render and the
     moment the backdrop starts watching `<html>`. The loop must still end up stopped. */
  const ClassLandsEarly = () => {
    useLayoutEffect(() => {
      document.documentElement.classList.add("reduce-motion");
    }, []);
    return null;
  };

  it("stops the weather canvas loop when the class lands before it is observed", () => {
    const { ctx } = makeMockContext();
    (ctx as unknown as { setTransform: ReturnType<typeof vi.fn> }).setTransform = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
    const queued = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      nextId += 1;
      queued.set(nextId, cb);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      queued.delete(id);
    });

    const scene = weatherScene({ condition: "cloudy", isDay: true, hint: null });
    render(
      createElement(
        Fragment,
        null,
        createElement(WeatherBackdrop, { scene, paused: false }),
        createElement(ClassLandsEarly),
      ),
    );

    // Whatever frame was queued before the setting was seen runs once and does not re-queue.
    const pending = [...queued.values()];
    queued.clear();
    pending.forEach((cb) => {
      cb(1000);
    });
    expect(queued.size).toBe(0);
  });
});

describe("WeatherAmbient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stays idle without a canvas until expanded, then animates and pauses after fade-out", () => {
    vi.useFakeTimers();
    const { ctx } = makeMockContext();
    (ctx as unknown as { setTransform: ReturnType<typeof vi.fn> }).setTransform = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const scene = weatherScene({ condition: "rain", isDay: true, hint: null });
    const { getByTestId, rerender } = render(
      createElement(WeatherAmbient, { scene, active: false }),
    );

    const ambient = getByTestId("weather-ambient");
    expect(ambient.getAttribute("data-active")).toBe("false");
    expect(ambient.getAttribute("data-precip")).toBe("rain");
    expect(ambient.querySelector("canvas")).toBeNull();
    expect(rafCallbacks).toHaveLength(0);

    // Expanding wakes the ambient canvas, marks the root for StatusBar transparency, and starts rAF
    rerender(createElement(WeatherAmbient, { scene, active: true }));
    expect(ambient.getAttribute("data-active")).toBe("true");
    expect(document.documentElement.dataset.weatherAmbient).toBe("true");
    expect(ambient.querySelector("canvas")).not.toBeNull();
    expect(rafCallbacks.length).toBeGreaterThan(0);

    rafCallbacks.shift()?.(1000);
    rafCallbacks.shift()?.(1032);

    // Collapsing clears the root flag, fades out, and cancels rAF once the fade completes
    rerender(createElement(WeatherAmbient, { scene, active: false }));
    expect(ambient.getAttribute("data-active")).toBe("false");
    expect(document.documentElement.dataset.weatherAmbient).toBeUndefined();
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(cancelSpy).toHaveBeenCalled();
  });
});
