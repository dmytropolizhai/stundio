/**
 * Applies the bounded appearance settings (corner radius, shadow depth, reduced motion) to
 * `<html>` as classes, the same mechanism `useTheme` uses for `.dark`. Each class re-points a
 * handful of DS aliases in `index.css` — never a base token file — so every option is still
 * something the Studio DS itself would recognise (CLAUDE.md: `ds/tokens/*` stays generated).
 */
import { useEffect } from "react";
import { useAppStore } from "../../store/index.ts";

export const useCustomization = (): void => {
  const cardRadius = useAppStore((s) => s.settings.cardRadius);
  const cardElevation = useAppStore((s) => s.settings.cardElevation);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("radius-2xl", cardRadius === "2xl");
    root.classList.toggle("elevation-bold", cardElevation === "bold");
    root.classList.toggle("reduce-motion", reduceMotion);
  }, [cardRadius, cardElevation, reduceMotion]);
};
