/**
 * What the Home screen says about the weather: the conditions for the hour on the clock, the
 * day's range, and at most one piece of advice that changes what a student does before leaving
 * — take an umbrella, dress warm. Pure and React-free, like `lib/schedule`.
 */
import type { RigaClock } from "@/lib/schedule";
import type { WeatherForecast } from "./forecast.ts";

export type WeatherCondition =
  "clear" | "partly-cloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "thunderstorm";

/** WMO weather interpretation codes, folded into what a person would call them. */
export const weatherCondition = (code: number): WeatherCondition => {
  if (code <= 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunderstorm";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  return "cloudy";
};

/** Chance of rain at or above this, in the hours that matter, earns the umbrella hint. */
export const UMBRELLA_PROBABILITY = 50;
/** "Feels like" at or below this earns the dress-warm hint. */
export const COLD_FEELS_LIKE = -5;

export type WeatherHint = "umbrella" | "snow" | "cold";

export type WeatherOutlook = {
  temperature: number;
  condition: WeatherCondition;
  isDay: boolean;
  /** Today's range, when the forecast still covers today. */
  max: number | null;
  min: number | null;
  hint: WeatherHint | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const hourKey = (date: string, minutes: number) =>
  `${date}T${pad(Math.min(23, Math.floor(minutes / 60)))}:00`;

/** The one hint for `date` between `from` and `to` (Riga minutes): wet hours win over cold. */
const hintFor = (
  forecast: WeatherForecast,
  date: string,
  from: number,
  to: number,
  feelsLike: number,
): WeatherHint | null => {
  const ahead =
    from > to
      ? []
      : forecast.hourly.filter((h) => h.time >= hourKey(date, from) && h.time <= hourKey(date, to));
  const wet = ahead.filter((h) => {
    const c = weatherCondition(h.code);
    return h.precipitationProbability >= UMBRELLA_PROBABILITY && c !== "clear" && c !== "fog";
  });
  if (wet.length > 0) {
    return wet.every((h) => weatherCondition(h.code) === "snow") ? "snow" : "umbrella";
  }
  return feelsLike <= COLD_FEELS_LIKE ? "cold" : null;
};

/**
 * The outlook for `now`, from a forecast that may be hours old (it is cached, and the app is
 * often opened offline). Fresh current conditions win; otherwise the forecast's own entry for
 * this hour stands in. `null` once the forecast no longer covers the hour.
 *
 * `window` is the stretch of the day the advice is about — the school day, in Riga minutes —
 * or `null` for "the rest of today". It never reaches back before `now`.
 */
export const weatherOutlook = (
  forecast: WeatherForecast | null,
  now: RigaClock,
  window: { start: number; end: number } | null = null,
): WeatherOutlook | null => {
  if (forecast === null) return null;
  const key = hourKey(now.date, now.minutes);
  const { current } = forecast;
  const hour = forecast.hourly.find((h) => h.time === key);

  let temperature: number;
  let code: number;
  let feelsLike: number;
  if (current.time.slice(0, 13) === key.slice(0, 13)) {
    temperature = current.temperature;
    code = current.code;
    feelsLike = current.apparentTemperature;
  } else if (hour !== undefined) {
    temperature = hour.temperature;
    code = hour.code;
    feelsLike = hour.temperature;
  } else {
    return null;
  }

  const from = Math.max(now.minutes, window?.start ?? now.minutes);
  const to = window?.end ?? 24 * 60 - 1;
  const hint = hintFor(forecast, now.date, from, to, feelsLike);

  const today = forecast.daily.find((d) => d.date === now.date);
  const isDay =
    current.time.slice(0, 13) === key.slice(0, 13)
      ? current.isDay
      : today?.sunrise == null || today.sunset == null
        ? true
        : key >= today.sunrise.slice(0, 13) && key < today.sunset.slice(0, 13);

  return {
    temperature: Math.round(temperature),
    condition: weatherCondition(code),
    isDay,
    max: today === undefined ? null : Math.round(today.max),
    min: today === undefined ? null : Math.round(today.min),
    hint,
  };
};

/** Without a school day to aim at, a later day's figure is the middle of the day. */
const MIDDAY = 12 * 60;

/**
 * The outlook for a day after today, browsed on Home: its daily condition and range, the
 * temperature the forecast gives for the middle of `window` (the school day, else midday), and
 * the hint for the whole of `window` — nothing about that day has happened yet, so the advice
 * never starts at "now". `null` when the forecast does not reach that far.
 *
 * Hourly rows carry no "feels like", so the cold hint reads the coldest plain temperature in
 * the window — the morning walk in, usually.
 */
export const dayWeatherOutlook = (
  forecast: WeatherForecast | null,
  date: string,
  window: { start: number; end: number } | null = null,
): WeatherOutlook | null => {
  const day = forecast?.daily.find((d) => d.date === date);
  if (forecast === null || day === undefined) return null;

  const from = window?.start ?? 0;
  const to = window?.end ?? 24 * 60 - 1;
  const hours = forecast.hourly.filter(
    (h) => h.time >= hourKey(date, from) && h.time <= hourKey(date, to),
  );
  const mid = hourKey(date, window === null ? MIDDAY : Math.floor((from + to) / 2));
  const temperature = forecast.hourly.find((h) => h.time === mid)?.temperature ?? day.max;
  const coldest = hours.length === 0 ? day.min : Math.min(...hours.map((h) => h.temperature));

  return {
    temperature: Math.round(temperature),
    condition: weatherCondition(day.code),
    isDay: true,
    max: Math.round(day.max),
    min: Math.round(day.min),
    hint: hintFor(forecast, date, from, to, coldest),
  };
};
