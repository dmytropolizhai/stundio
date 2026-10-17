/**
 * Which shell the app runs in, decided once here so call sites ask about a capability
 * ("does this build have its own notifications?") instead of combining Capacitor and Tauri
 * probes themselves. Add a shell by extending `Platform`; the exhaustive switches below then
 * fail to compile until every capability has an answer for it.
 */
import { Capacitor } from "@capacitor/core";
import { isDesktop } from "@/lib/desktop";

export type Platform = "android" | "desktop" | "web";

export const currentPlatform = (): Platform => {
  if (Capacitor.isNativePlatform()) return "android";
  if (isDesktop()) return "desktop";
  return "web";
};

/** Talks to EduPage itself (native HTTP, no CORS) rather than through the hosted proxy. */
export const reachesSchoolDirectly = (platform: Platform): boolean => {
  switch (platform) {
    case "android":
    case "desktop":
      return true;
    case "web":
      return false;
  }
};

/**
 * Shows its own notifications (reminders, change alerts) from the running app. The web build
 * has Web Push instead, sent by the server.
 */
export const hasAppNotifications = (platform: Platform): boolean => reachesSchoolDirectly(platform);
