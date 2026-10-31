/**
 * Which layout the window is wide enough for: the phone layout (the reference — every other one
 * is an addition on top of it), a tablet layout with an icon rail, or a desktop layout with a
 * labelled rail and a side column on Home.
 *
 * The queries also require some height so a phone turned to landscape keeps the phone layout:
 * an 844×390 window is wide, but a rail and a side column would leave it no room for the day.
 * The same numbers drive the `tablet:` / `desktop:` Tailwind variants in `index.css` and the
 * token overrides in `desktop.css` — change all three together.
 *
 * With no `matchMedia` (old WebViews, the test environment) this is always the phone layout.
 */
import { useSyncExternalStore } from "react";

export type Layout = "phone" | "tablet" | "desktop";

export const LAYOUT_QUERIES = {
  tablet: "(min-width: 768px) and (min-height: 500px)",
  desktop: "(min-width: 1024px) and (min-height: 500px)",
} as const;

const media = (query: string): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;

const subscribe = (onChange: () => void) => {
  const lists = [media(LAYOUT_QUERIES.tablet), media(LAYOUT_QUERIES.desktop)];
  // Optional calls: some old WebViews hand back a MediaQueryList without addEventListener.
  for (const list of lists) list?.addEventListener?.("change", onChange);
  return () => {
    for (const list of lists) list?.removeEventListener?.("change", onChange);
  };
};

export const currentLayout = (): Layout => {
  if (media(LAYOUT_QUERIES.desktop)?.matches === true) return "desktop";
  if (media(LAYOUT_QUERIES.tablet)?.matches === true) return "tablet";
  return "phone";
};

export const useLayout = (): Layout =>
  useSyncExternalStore(subscribe, currentLayout, () => "phone");
