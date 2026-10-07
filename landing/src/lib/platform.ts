/*
 * Which phone is this? A deliberate copy of the app's rules (`src/ui/lib/platform.ts`):
 * Android is `/Android/i`; iOS is `/iPhone|iPad|iPod/i` or an iPad posing as a Mac
 * (`MacIntel` with touch); anything else is a computer. The landing must never disagree with
 * the app about this, so `platform.test.ts` runs both over the same user-agent fixtures.
 *
 * Pure (takes the facts as arguments) so it runs in the head script, in the page module and
 * under test without touching `navigator`.
 */
export type Platform = "android" | "ios" | "desktop";
export const PLATFORMS: readonly Platform[] = ["android", "ios", "desktop"];

export type PlatformProbe = {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
};

export const detectPlatform = (probe: PlatformProbe): Platform => {
  const isIosUa = /iPhone|iPad|iPod/i.test(probe.userAgent);
  const isIpadOs = probe.platform === "MacIntel" && probe.maxTouchPoints > 1;
  if (isIosUa || isIpadOs) return "ios";
  if (/Android/i.test(probe.userAgent)) return "android";
  return "desktop";
};

export const isPlatform = (value: string | null | undefined): value is Platform =>
  PLATFORMS.some((p) => p === value);

/** `?platform=android|ios|desktop` — a QA override; anything else is ignored. */
export const platformFromSearch = (search: string): Platform | null => {
  const value = new URLSearchParams(search).get("platform");
  return isPlatform(value) ? value : null;
};
