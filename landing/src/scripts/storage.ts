/*
 * localStorage / sessionStorage that never throws. Storage is blocked in private windows, in
 * some in-app browsers and during previews, so every read and write is wrapped and the page works
 * the same without it (a preference just does not stick).
 */
type Store = "local" | "session";

const area = (kind: Store): Storage | null => {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export const readStored = (kind: Store, key: string): string | null => {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const writeStored = (kind: Store, key: string, value: string): void => {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    /* a preference that does not persist is fine */
  }
};

export const KEYS = {
  lang: "l-lang",
  langDecided: "l-lang-decided",
  platform: "l-platform",
  noAnalytics: "l-noanalytics",
} as const;
