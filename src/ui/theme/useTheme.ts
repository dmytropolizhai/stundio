/**
 * Applies the theme setting to <html>. Tailwind's dark variant is class-based here
 * (`index.css`) because "system" is only one of three choices the user has.
 */
import { useEffect } from "react";
import { useAppStore } from "../../store/index.ts";
import type { Settings } from "../../db/index.ts";
import { nativeSystemBars } from "@/lib/systembars";

export type Theme = Settings["theme"];

const prefersDark = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const resolveTheme = (theme: Theme, systemDark: boolean): "light" | "dark" =>
  theme === "system" ? (systemDark ? "dark" : "light") : theme;

export const applyTheme = (resolved: "light" | "dark"): void => {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Status/navigation bar icon colour (Android only — see lib/systembars/native.ts); a no-op
  // everywhere else.
  void nativeSystemBars()?.(resolved);
};

export const useTheme = (): void => {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      applyTheme(resolveTheme(theme, false));
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      applyTheme(resolveTheme(theme, prefersDark()));
    };
    sync();

    // Only "system" needs to follow the OS; an explicit choice must survive a system switch.
    if (theme !== "system") return;
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, [theme]);
};
