/**
 * Hex/HSL conversions and contrast-ink selection for free-form colour pickers.
 *
 * Generic colour maths only — nothing here knows what a "subject" or a "tone" is. `ColorWheel`
 * uses the hex/HSL pair for its own dragging maths; `ui/theme/colors.ts` uses `readableInk` to
 * pick text for a colour it did not ship a pre-approved pairing for.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toHex2 = (value: number): string =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

export const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-f]{6}$/i.test(value);

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = isHexColor(hex) ? hex : "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

export const rgbToHex = (r: number, g: number, b: number): `#${string}` =>
  `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;

/** `h` in [0, 360), `s`/`l` in [0, 100]. */
export const hslToHex = (h: number, s: number, l: number): `#${string}` => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  const [r1, g1, b1] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
};

export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60;

  return { h, s: s * 100, l: l * 100 };
};

/**
 * WCAG relative luminance, used only to pick which of two fixed inks reads on an arbitrary fill —
 * not a contrast-ratio check. `ui/theme/colors.ts` documents the trade-off this makes against the
 * DS's pre-shipped tone pairs, each of which does guarantee 4.5:1.
 */
export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const lin = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** Near-black or near-white ink — whichever clears an arbitrary fill colour. */
export const readableInk = (hex: string): string =>
  relativeLuminance(hex) > 0.42 ? "#0b0c10" : "#ffffff";
