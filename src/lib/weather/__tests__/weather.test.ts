import { describe, expect, it, vi } from "vitest";
import {
  fetchForecast,
  forecastUrl,
  parseForecast,
  weatherCondition,
  weatherOutlook,
  type WeatherForecast,
} from "@/lib/weather";

const FETCHED = "2026-10-18T05:00:00.000Z";

/** Open-Meteo's shape for 2026-10-18, hours 00–23 in Riga. */
const raw = (
  over: { codes?: number[]; rain?: number[]; temps?: number[]; current?: object } = {},
) => {
  const hours = Array.from({ length: 24 }, (_, h) => `2026-10-18T${String(h).padStart(2, "0")}:00`);
  return {
    current: {
      time: "2026-10-18T08:15",
      temperature_2m: 7.4,
      apparent_temperature: 4.1,
      weather_code: 3,
      is_day: 1,
      ...over.current,
    },
    hourly: {
      time: hours,
      temperature_2m: over.temps ?? hours.map(() => 8),
      precipitation_probability: over.rain ?? hours.map(() => 10),
      weather_code: over.codes ?? hours.map(() => 3),
    },
    daily: {
      time: ["2026-10-18"],
      weather_code: [61],
      temperature_2m_max: [10.6],
      temperature_2m_min: [3.2],
      precipitation_probability_max: [70],
      sunrise: ["2026-10-18T08:04"],
      sunset: ["2026-10-18T18:21"],
    },
  };
};

const forecast = (over?: Parameters<typeof raw>[0]): WeatherForecast =>
  parseForecast(raw(over), FETCHED)!;

const at = (hh: number, mm = 0) => ({ date: "2026-10-18", minutes: hh * 60 + mm });

describe("parseForecast", () => {
  it("reads current conditions, hours and days", () => {
    const f = forecast();
    expect(f.current).toEqual({
      time: "2026-10-18T08:15",
      temperature: 7.4,
      apparentTemperature: 4.1,
      code: 3,
      isDay: true,
    });
    expect(f.hourly).toHaveLength(24);
    expect(f.daily[0]).toMatchObject({
      date: "2026-10-18",
      max: 10.6,
      min: 3.2,
      sunset: "2026-10-18T18:21",
    });
  });

  it("never throws on junk, and skips malformed rows", () => {
    expect(parseForecast(null, FETCHED)).toBeNull();
    expect(parseForecast({ current: { time: 1 } }, FETCHED)).toBeNull();
    expect(parseForecast([], FETCHED)).toBeNull();

    const partial = parseForecast(
      {
        current: { time: "2026-10-18T08:00", temperature_2m: 1, weather_code: 0 },
        hourly: { time: ["2026-10-18T08:00", 5], temperature_2m: [1, 2], weather_code: [0, 0] },
        daily: { time: ["2026-10-18"], weather_code: [0], temperature_2m_max: ["x"] },
      },
      FETCHED,
    )!;
    expect(partial.current.apparentTemperature).toBe(1);
    expect(partial.hourly).toEqual([
      { time: "2026-10-18T08:00", temperature: 1, precipitationProbability: 0, code: 0 },
    ]);
    expect(partial.daily).toEqual([]);
  });
});

describe("fetchForecast", () => {
  it("asks for Riga, in Riga time, and parses the answer", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(JSON.stringify(raw()))));
    const f = await fetchForecast(fetchImpl, () => new Date(FETCHED))();
    expect(fetchImpl).toHaveBeenCalledWith(forecastUrl());
    expect(forecastUrl()).toContain("timezone=Europe%2FRiga");
    expect(f?.fetchedAt).toBe(FETCHED);
  });

  it("returns null instead of throwing when offline or refused", async () => {
    expect(await fetchForecast(() => Promise.reject(new Error("offline")))()).toBeNull();
    expect(
      await fetchForecast(() => Promise.resolve(new Response("", { status: 500 })))(),
    ).toBeNull();
  });
});

describe("weatherCondition", () => {
  it.each([
    [0, "clear"],
    [2, "partly-cloudy"],
    [3, "cloudy"],
    [45, "fog"],
    [53, "drizzle"],
    [63, "rain"],
    [81, "rain"],
    [73, "snow"],
    [86, "snow"],
    [95, "thunderstorm"],
    [42, "cloudy"],
  ])("code %i is %s", (code, condition) => {
    expect(weatherCondition(code)).toBe(condition);
  });
});

describe("weatherOutlook", () => {
  it("is null without a forecast, or once it no longer covers the hour", () => {
    expect(weatherOutlook(null, at(9))).toBeNull();
    expect(weatherOutlook(forecast(), { date: "2026-10-21", minutes: 600 })).toBeNull();
  });

  it("prefers fresh current conditions, with today's range", () => {
    expect(weatherOutlook(forecast(), at(8, 40))).toEqual({
      temperature: 7,
      condition: "cloudy",
      isDay: true,
      max: 11,
      min: 3,
      hint: null,
    });
  });

  it("falls back to this hour's forecast when the current reading is old", () => {
    const temps = Array.from({ length: 24 }, (_, h) => h);
    const late = weatherOutlook(forecast({ temps }), at(21, 10))!;
    expect(late.temperature).toBe(21);
    expect(late.isDay).toBe(false);
    expect(weatherOutlook(forecast({ temps }), at(12))!.isDay).toBe(true);
  });

  it("suggests an umbrella only for rain in the window, from now on", () => {
    const rain = Array.from({ length: 24 }, (_, h) => (h === 15 ? 80 : 0));
    const codes = Array.from({ length: 24 }, (_, h) => (h === 15 ? 63 : 3));
    const f = forecast({ rain, codes });
    expect(weatherOutlook(f, at(8, 30), { start: 510, end: 16 * 60 })?.hint).toBe("umbrella");
    expect(weatherOutlook(f, at(8, 30), { start: 510, end: 13 * 60 })?.hint).toBeNull();
    // Past the window: nothing ahead to warn about.
    expect(weatherOutlook(f, at(17), { start: 510, end: 16 * 60 })?.hint).toBeNull();
    // No window: the rest of today.
    expect(weatherOutlook(f, at(8, 30))?.hint).toBe("umbrella");
  });

  it("calls snow snow, and the cold cold", () => {
    const rain = Array.from({ length: 24 }, () => 90);
    const codes = Array.from({ length: 24 }, () => 73);
    expect(weatherOutlook(forecast({ rain, codes }), at(8, 30))?.hint).toBe("snow");
    expect(
      weatherOutlook(forecast({ current: { apparent_temperature: -9 } }), at(8, 30))?.hint,
    ).toBe("cold");
  });
});
