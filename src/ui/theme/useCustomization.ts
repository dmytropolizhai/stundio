/**
 * Applies the bounded appearance settings (corner radius, shadow depth, reduced motion, global
 * accent) to `<html>` as classes, the same mechanism `useTheme` uses for `.dark`. Each class
 * re-points a handful of DS aliases in `index.css` — never a base token file — so every option is
 * still something the Studio DS itself would recognise (CLAUDE.md: `ds/tokens/*` stays generated).
 */
import { useEffect } from "react";
import { useAppStore } from "@/store";
import { SUBJECT_TONES } from "./colors.ts";

export const useCustomization = (): void => {
  const cardRadius = useAppStore((s) => s.settings.cardRadius);
  const cardElevation = useAppStore((s) => s.settings.cardElevation);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);
  const appAccent = useAppStore((s) => s.settings.appAccent);

  useEffect(() => {
    const root = document.documentElement;
    // "xl" is the DS's own card default and needs no override — only the other three steps do.
    root.classList.toggle("radius-md", cardRadius === "md");
    root.classList.toggle("radius-lg", cardRadius === "lg");
    root.classList.toggle("radius-2xl", cardRadius === "2xl");
    root.classList.toggle("elevation-bold", cardElevation === "bold");
    root.classList.toggle("reduce-motion", reduceMotion);
    // "default" needs no override — it is `colors.css`'s own ink-based emphasis colour.
    for (const tone of SUBJECT_TONES) {
      root.classList.toggle(`accent-${tone}`, appAccent === tone);
    }
  }, [cardRadius, cardElevation, reduceMotion, appAccent]);
};
