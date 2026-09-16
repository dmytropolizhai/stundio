/**
 * The only file under lib/analytics allowed to import Capacitor (enforced by ESLint,
 * mirroring `lib/edupage/http.ts`).
 */
import { Capacitor, CapacitorHttp } from "@capacitor/core";

export type HttpClient = (url: string, body: unknown) => Promise<void>;

/** Identifies the app to Plausible, same spirit as EduPage's `USER_AGENT`. */
export const USER_AGENT = `Stundio/${__APP_VERSION__} (Android; Capacitor)`;

/** Native HTTP — the real transport on Android. Fire-and-forget: analytics never blocks the UI. */
export const capacitorHttp: HttpClient = async (url, body) => {
  await CapacitorHttp.post({
    url,
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    data: body,
  });
};

/** `fetch` transport for Vitest and the web dev preview. */
export const fetchHttp: HttpClient = async (url, body) => {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

/** The transport for this platform: native on Android, fetch in browsers. */
export const defaultHttp: HttpClient = (url, body) =>
  Capacitor.isNativePlatform() ? capacitorHttp(url, body) : fetchHttp(url, body);
