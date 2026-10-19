/**
 * Riga's weather from Open-Meteo — free, keyless, CORS-friendly, so a plain `fetch` reaches it
 * from every shell. The request names the city, never the device: no location permission, no
 * identifier, nothing that says who is asking (AGENT.md, "No PII").
 *
 * The parser never throws, like the EduPage one: a malformed answer is "no weather", not a
 * crash. Times stay as Open-Meteo sends them for `timezone=Europe/Riga` — Riga wall-clock
 * strings ("2026-10-18T14:00"), matching `RigaClock` without any date maths.
 */
import type { ISODate, ISODateTime } from "@/lib/edupage";

/** Central Riga; both RVT buildings are close enough that one forecast covers the day. */
export const RIGA = { latitude: 56.9496, longitude: 24.1052 } as const;

export type WeatherHour = {
  /** Riga wall clock, "YYYY-MM-DDTHH:00". */
  time: string;
  temperature: number;
  precipitationProbability: number;
  /** WMO weather interpretation code. */
  code: number;
};

export type WeatherDay = {
  date: ISODate;
  code: number;
  max: number;
  min: number;
  precipitationProbability: number;
  /** Riga wall clock, "YYYY-MM-DDTHH:mm"; `null` when Open-Meteo leaves it out. */
  sunrise: string | null;
  sunset: string | null;
};

export type WeatherForecast = {
  fetchedAt: ISODateTime;
  current: {
    /** Riga wall clock, "YYYY-MM-DDTHH:mm". */
    time: string;
    temperature: number;
    apparentTemperature: number;
    code: number;
    isDay: boolean;
  };
  hourly: WeatherHour[];
  daily: WeatherDay[];
};

export const forecastUrl = (): string => {
  const params = new URLSearchParams({
    latitude: String(RIGA.latitude),
    longitude: String(RIGA.longitude),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "Europe/Riga",
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const column = (block: Record<string, unknown>, key: string): unknown[] =>
  Array.isArray(block[key]) ? (block[key] as unknown[]) : [];

/** Open-Meteo's JSON → `WeatherForecast`, or `null` when the current conditions are unusable. */
export const parseForecast = (data: unknown, fetchedAt: ISODateTime): WeatherForecast | null => {
  if (!isRecord(data) || !isRecord(data.current)) return null;
  const c = data.current;
  const temperature = num(c.temperature_2m);
  const code = num(c.weather_code);
  if (typeof c.time !== "string" || temperature === null || code === null) return null;

  const hourly: WeatherHour[] = [];
  if (isRecord(data.hourly)) {
    const h = data.hourly;
    const temps = column(h, "temperature_2m");
    const rain = column(h, "precipitation_probability");
    const codes = column(h, "weather_code");
    column(h, "time").forEach((time, i) => {
      const t = num(temps[i]);
      const k = num(codes[i]);
      if (typeof time !== "string" || t === null || k === null) return;
      hourly.push({ time, temperature: t, precipitationProbability: num(rain[i]) ?? 0, code: k });
    });
  }

  const daily: WeatherDay[] = [];
  if (isRecord(data.daily)) {
    const d = data.daily;
    const codes = column(d, "weather_code");
    const max = column(d, "temperature_2m_max");
    const min = column(d, "temperature_2m_min");
    const rain = column(d, "precipitation_probability_max");
    const sunrise = column(d, "sunrise");
    const sunset = column(d, "sunset");
    const text = (v: unknown) => (typeof v === "string" ? v : null);
    column(d, "time").forEach((date, i) => {
      const k = num(codes[i]);
      const hi = num(max[i]);
      const lo = num(min[i]);
      if (typeof date !== "string" || k === null || hi === null || lo === null) return;
      daily.push({
        date,
        code: k,
        max: hi,
        min: lo,
        precipitationProbability: num(rain[i]) ?? 0,
        sunrise: text(sunrise[i]),
        sunset: text(sunset[i]),
      });
    });
  }

  return {
    fetchedAt,
    current: {
      time: c.time,
      temperature,
      apparentTemperature: num(c.apparent_temperature) ?? temperature,
      code,
      isDay: c.is_day !== 0,
    },
    hourly,
    daily,
  };
};

export type FetchForecast = () => Promise<WeatherForecast | null>;

/** Never throws: offline or a bad answer both mean "keep whatever is cached". */
export const fetchForecast =
  (
    fetchImpl: (url: string) => Promise<Response> = (url) => fetch(url),
    clock: () => Date = () => new Date(),
  ): FetchForecast =>
  async () => {
    try {
      const res = await fetchImpl(forecastUrl());
      if (!res.ok) return null;
      return parseForecast(await res.json(), clock().toISOString());
    } catch {
      return null;
    }
  };
