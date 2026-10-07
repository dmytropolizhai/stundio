import { afterEach, describe, expect, it, vi } from "vitest";
import { isAndroidDevice, isIosDevice } from "../../../src/ui/lib/platform.ts";
import { detectPlatform, platformFromSearch, type PlatformProbe } from "./platform.ts";

const FIXTURES: readonly (readonly [string, PlatformProbe, "android" | "ios" | "desktop"])[] = [
  [
    "Pixel in Chrome",
    {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
      platform: "Linux armv81",
      maxTouchPoints: 5,
    },
    "android",
  ],
  [
    "Telegram in-app browser on Android",
    {
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-S918B; wv) AppleWebKit/537.36 Version/4.0 Chrome/120.0 Mobile Safari/537.36 Telegram-Android/10.0",
      platform: "Linux armv81",
      maxTouchPoints: 5,
    },
    "android",
  ],
  [
    "iPhone Safari",
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    },
    "ios",
  ],
  [
    "iPad in desktop mode",
    {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    },
    "ios",
  ],
  [
    "Mac without touch",
    {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    },
    "desktop",
  ],
  [
    "Windows Chrome",
    {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      platform: "Win32",
      maxTouchPoints: 0,
    },
    "desktop",
  ],
];

describe("detectPlatform", () => {
  it.each(FIXTURES)("%s", (_name, probe, expected) => {
    expect(detectPlatform(probe)).toBe(expected);
  });
});

describe("parity with the app's own detection (src/ui/lib/platform.ts)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(FIXTURES)("%s", (_name, probe) => {
    vi.stubGlobal("navigator", {
      userAgent: probe.userAgent,
      platform: probe.platform,
      maxTouchPoints: probe.maxTouchPoints,
    });
    const app = isIosDevice() ? "ios" : isAndroidDevice() ? "android" : "desktop";
    expect(detectPlatform(probe)).toBe(app);
  });
});

describe("platformFromSearch", () => {
  it("accepts the three platforms and nothing else", () => {
    expect(platformFromSearch("?platform=ios")).toBe("ios");
    expect(platformFromSearch("?x=1&platform=android")).toBe("android");
    expect(platformFromSearch("?platform=desktop")).toBe("desktop");
    expect(platformFromSearch("?platform=windows")).toBeNull();
    expect(platformFromSearch("")).toBeNull();
  });
});
