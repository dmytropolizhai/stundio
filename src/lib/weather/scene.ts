/**
 * Maps a `WeatherOutlook` to the visual scene behind the Home weather tile: sky palette,
 * celestial body, cloud/mist cover, precipitation, frost sheen, and storm flash.
 *
 * The school-hours hint overrides the current hour so a rainy or snowy school window still
 * warns the user even when the current hour happens to be dry. Pure and React-free.
 */
import type { WeatherCondition, WeatherOutlook } from "./outlook.ts";

export type WeatherSky =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy-day"
  | "cloudy-night"
  | "fog-day"
  | "fog-night"
  | "cold"
  | "storm";

export type WeatherPrecip = "none" | "drizzle" | "rain" | "snow";
export type WeatherCelestial = "none" | "sun" | "moon";
export type WeatherClouds = "none" | "few" | "overcast" | "fog";

export type WeatherScene = {
  sky: WeatherSky;
  precip: WeatherPrecip;
  celestial: WeatherCelestial;
  clouds: WeatherClouds;
  flash: boolean;
  frost: boolean;
};

const baseScene = (condition: WeatherCondition, isDay: boolean): WeatherScene => {
  switch (condition) {
    case "clear":
      return {
        sky: isDay ? "clear-day" : "clear-night",
        precip: "none",
        celestial: isDay ? "sun" : "moon",
        clouds: "none",
        flash: false,
        frost: false,
      };
    case "partly-cloudy":
      return {
        sky: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
        precip: "none",
        celestial: isDay ? "sun" : "moon",
        clouds: "few",
        flash: false,
        frost: false,
      };
    case "cloudy":
      return {
        sky: isDay ? "cloudy-day" : "cloudy-night",
        precip: "none",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      };
    case "fog":
      return {
        sky: isDay ? "fog-day" : "fog-night",
        precip: "none",
        celestial: "none",
        clouds: "fog",
        flash: false,
        frost: false,
      };
    case "drizzle":
      return {
        sky: isDay ? "cloudy-day" : "cloudy-night",
        precip: "drizzle",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      };
    case "rain":
      return {
        sky: isDay ? "cloudy-day" : "cloudy-night",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: false,
      };
    case "snow":
      return {
        sky: "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: false,
        frost: true,
      };
    case "thunderstorm":
      return {
        sky: "storm",
        precip: "rain",
        celestial: "none",
        clouds: "overcast",
        flash: true,
        frost: false,
      };
  }
};

export const weatherScene = (
  outlook: Pick<WeatherOutlook, "condition" | "isDay" | "hint">,
): WeatherScene => {
  const base = baseScene(outlook.condition, outlook.isDay);
  switch (outlook.hint) {
    case "umbrella":
      return {
        sky:
          base.sky === "storm" || base.sky === "fog-day" || base.sky === "fog-night"
            ? base.sky
            : outlook.isDay
              ? "cloudy-day"
              : "cloudy-night",
        precip: "rain",
        celestial: "none",
        clouds: base.clouds === "fog" ? "fog" : "overcast",
        flash: base.flash,
        frost: false,
      };
    case "snow":
      return {
        sky: base.sky === "storm" ? "storm" : "cold",
        precip: "snow",
        celestial: "none",
        clouds: "overcast",
        flash: base.flash,
        frost: true,
      };
    case "cold":
      return {
        sky: "cold",
        precip: "none",
        celestial:
          outlook.condition === "clear" || outlook.condition === "partly-cloudy"
            ? outlook.isDay
              ? "sun"
              : "moon"
            : "none",
        clouds: base.clouds,
        flash: false,
        frost: true,
      };
    case null:
      return base;
  }
};
