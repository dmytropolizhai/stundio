/*
 * Inline SVG icons. Lucide geometry, 2px stroke on a 24 grid, `currentColor`, hidden from
 * assistive tech — an icon always sits beside real text on this page. The brand mark is the
 * app's `public/mark.svg` path with `fill="currentColor"` (the file itself is white, so it would
 * vanish on the light page — 03b F2).
 */
import { html, raw, type Html } from "../html.ts";
import { ICON_PATHS } from "./paths.ts";

export type IconName = keyof typeof ICON_PATHS;

export const icon = (name: IconName, size = 20): Html => {
  const nodes = ICON_PATHS[name]
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${list}/>`;
    })
    .join("");
  return raw(
    `<svg class="l-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
      `aria-hidden="true" focusable="false">${nodes}</svg>`,
  );
};

const MARK_PATH =
  "M52.8971 63.3499C18.3191 88.5438 99.209 127.823 63.9113 127.823C28.6137 127.823 0 99.2085 0 63.9113C0 28.6141 28.6137 0 63.9113 0C99.209 0 87.475 38.156 52.8971 63.3499Z";

export const mark = (): Html =>
  html`<svg class="l-brand__mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="${MARK_PATH}" />
  </svg>`;
