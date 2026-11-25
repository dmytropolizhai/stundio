import { describe, expect, it, vi } from "vitest";
import { weatherScene, type WeatherCondition, type WeatherHint } from "@/lib/weather";
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
});
