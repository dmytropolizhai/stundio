/**
 * The live theme, read back as plain colour strings the canvas can use.
 *
 * A shared card has to look like the app the reader will be pointed at, and the app's colours
 * live in `ds/tokens/*.css` — so they are read from the document rather than copied here, which
 * also means a dark-mode user shares a dark card without a second palette to maintain. The
 * fallbacks are the light tokens, for the one case where there is no live stylesheet to read
 * (a test renderer, a WebView that has not applied CSS yet).
 */
import type { SharePalette } from "@/lib/share";
import { SUBJECT_TONES, type SubjectAccent, type SubjectTone } from "@/ui/theme";

export type ToneColors = { fill: string; ink: string };
export type ShareTheme = { palette: SharePalette; tones: Record<SubjectTone, ToneColors> };

/** `ds/tokens/colors.css`, light values — the Night / Day design system's own defaults. */
const FALLBACK_SURFACE: Record<keyof SharePalette, string> = {
  background: "#ebeaee",
  surface: "#f8f8fa",
  sunken: "#e0dfe5",
  hairline: "#d3d2da",
  strongBorder: "#7c7f8b",
  text: "#2e3038",
  strong: "#121419",
  muted: "#5d606b",
  shadow: "rgba(18, 20, 25, 0.16)",
};

const FALLBACK_TONES: Record<SubjectTone, ToneColors> = {
  amber: { fill: "#b3cfa1", ink: "#1f3415" },
  sky: { fill: "#a9bfe6", ink: "#162a4d" },
  lilac: { fill: "#c3b4ea", ink: "#2b1e52" },
  pink: { fill: "#eeaeb8", ink: "#4f1621" },
  mint: { fill: "#8fd0c8", ink: "#0f3733" },
  lime: { fill: "#5a5fb0", ink: "#f3f2ff" },
};

const VARS: Record<keyof SharePalette, string> = {
  background: "--bg-app",
  surface: "--surface-card",
  sunken: "--surface-sunken",
  hairline: "--border-hairline",
  strongBorder: "--border-strong",
  text: "--text-body",
  strong: "--text-strong",
  muted: "--text-muted",
  // The design system's shadows are composites, and canvas takes one colour — so this is the
  // navy they are all tinted with rather than a token, and it darkens for a dark ground the way
  // `--shadow-card` does under `.dark`.
  shadow: "--share-shadow",
};

type Vars = { getPropertyValue: (property: string) => string };

const read = (vars: Vars, name: string, fallback: string): string => {
  const value = vars.getPropertyValue(name).trim();
  return value === "" ? fallback : value;
};

/**
 * `vars` is injectable purely so this is testable; in the app it is always the computed style of
 * `<html>`, which is where both `:root` and the `.dark` override land.
 */
export const shareTheme = (vars: Vars = getComputedStyle(document.documentElement)): ShareTheme => {
  const palette = {} as SharePalette;
  for (const key of Object.keys(VARS) as (keyof SharePalette)[]) {
    palette[key] = read(vars, VARS[key], FALLBACK_SURFACE[key]);
  }

  const tones = {} as Record<SubjectTone, ToneColors>;
  for (const tone of SUBJECT_TONES) {
    tones[tone] = {
      fill: read(vars, `--accent-${tone}`, FALLBACK_TONES[tone].fill),
      ink: read(vars, `--accent-${tone}-ink`, FALLBACK_TONES[tone].ink),
    };
  }

  return { palette, tones };
};

/**
 * A subject's fill/ink for the canvas painter: one of the six live theme tones, or — for a
 * `ColorWheel` custom pick, which has no theme token to read — the exact colour `subjectAccent`
 * already resolved (`ui/theme/colors.ts`), so a shared card matches the on-screen custom colour.
 */
export const accentFillInk = (accent: SubjectAccent, theme: ShareTheme): ToneColors =>
  accent.tone === "custom" ? { fill: accent.fill, ink: accent.ink } : theme.tones[accent.tone];
