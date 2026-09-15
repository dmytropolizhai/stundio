/**
 * Browser platform detection for iOS and PWA standalone mode.
 *
 * Does not import Capacitor — purely inspects standard browser APIs.
 */

export const isIosDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIosUa = /iPhone|iPad|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
  return isIosUa || isIpadOs;
};

export const isStandalonePwa = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
};
