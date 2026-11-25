import { describe, expect, it } from "vitest";
import {
  weatherScene,
  type WeatherCondition,
  type WeatherHint,
  type WeatherScene,
} from "../index.ts";

describe("weatherScene", () => {
  const baseCases: Array<[WeatherCondition, boolean, WeatherScene]> = [
    [
      "clear",
      true,
      {
        sky: "clear-day",
        precip: "none",
        celestial: "sun",
        clouds: "none",
        flash: false,
        frost: false,
      },
    ],
    [
      "clear",
      false,
      {
        sky: "clear-night",
        precip: "none",
        celestial: "moon",
        clouds: "none",
        flash: false,
        frost: false,
      },
    ],
    [
      "partly-cloudy",
      true,
      {
        sky: "partly-cloudy-day",
        precip: "none",
        celestial: "sun",
        clouds: "few",
        flash: false,
        frost: false,
      },
    ],
    [
      "partly-cloudy",
      false,
      {
        sky: "partly-cloudy-night",
        precip: "none",
        celestial: "moon",
        clouds: "few",
        flash: false,
        frost: false,
      },
    ],
    [
      "cloudy",
      true,
      {
        sky: "cloudy-day",
        precip: "none",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "cloudy",
      false,
      {
        sky: "cloudy-night",
        precip: "none",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "fog",
      true,
      {
        sky: "fog-day",
        precip: "none",
        celestial: "none",
        clouds: "fog",
        flash: false,
        frost: false,
      },
    ],
    [
      "fog",
      false,
      {
        sky: "fog-night",
        precip: "none",
        celestial: "none",
        clouds: "fog",
        flash: false,
        frost: false,
      },
    ],
    [
      "drizzle",
      true,
      {
        sky: "cloudy-day",
        precip: "drizzle",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "drizzle",
      false,
      {
        sky: "cloudy-night",
        precip: "drizzle",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "rain",
      true,
      {
        sky: "cloudy-day",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "rain",
      false,
      {
        sky: "cloudy-night",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "snow",
      true,
      {
        sky: "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
    [
      "snow",
      false,
      {
        sky: "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
    [
      "thunderstorm",
      true,
      {
        sky: "storm",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: true,
        frost: false,
      },
    ],
    [
      "thunderstorm",
      false,
      {
        sky: "storm",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: true,
        frost: false,
      },
    ],
  ];

  it.each(baseCases)("maps %s (isDay=%s) with no hint to %o", (condition, isDay, expected) => {
    expect(weatherScene({ condition, isDay, hint: null })).toEqual(expected);
  });

  const hintCases: Array<[WeatherCondition, boolean, WeatherHint, WeatherScene]> = [
    [
      "clear",
      true,
      "umbrella",
      {
        sky: "cloudy-day",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "clear",
      false,
      "umbrella",
      {
        sky: "cloudy-night",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "drizzle",
      true,
      "umbrella",
      {
        sky: "cloudy-day",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      },
    ],
    [
      "fog",
      true,
      "umbrella",
      {
        sky: "fog-day",
        precip: "rain",
        celestial: "none",
        clouds: "fog",
        flash: false,
        frost: false,
      },
    ],
    [
      "thunderstorm",
      true,
      "umbrella",
      {
        sky: "storm",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: true,
        frost: false,
      },
    ],
    [
      "clear",
      true,
      "snow",
      {
        sky: "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
    [
      "cloudy",
      false,
      "snow",
      {
        sky: "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
    [
      "thunderstorm",
      true,
      "snow",
      {
        sky: "storm",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: true,
        frost: true,
      },
    ],
    [
      "clear",
      true,
      "cold",
      {
        sky: "cold",
        precip: "none",
        celestial: "sun",
        clouds: "none",
        flash: false,
        frost: true,
      },
    ],
    [
      "partly-cloudy",
      false,
      "cold",
      {
        sky: "cold",
        precip: "none",
        celestial: "moon",
        clouds: "few",
        flash: false,
        frost: true,
      },
    ],
    [
      "cloudy",
      false,
      "cold",
      {
        sky: "cold",
        precip: "none",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
    [
      "rain",
      true,
      "cold",
      {
        sky: "cold",
        precip: "none",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      },
    ],
  ];

  it.each(hintCases)(
    "applies hint override for %s (isDay=%s, hint=%s) -> %o",
    (condition, isDay, hint, expected) => {
      expect(weatherScene({ condition, isDay, hint })).toEqual(expected);
    },
  );
});
