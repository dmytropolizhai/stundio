/*
 * Dark theme without copies. The app's dark theme is a `:root.dark { … }` block in
 * `src/ds/tokens/dark.css` (a user setting). The landing follows the OS instead, so this plugin
 * lifts that block's body and re-emits it under `@media (prefers-color-scheme: dark)` wherever
 * `styles/ds-dark.css` carries the marker comment below. Edit the DS and both surfaces move
 * together. If the block is not found the build fails loudly rather than shipping a light-only
 * dark mode (same stance as the app's precache manifest).
 */
import { readFileSync } from "node:fs";
import type { AcceptedPlugin } from "postcss";

export const DS_DARK_MARKER = "/* @ds-dark */";

export const extractDarkBlock = (css: string): string => {
  const start = css.indexOf(":root.dark");
  const open = start === -1 ? -1 : css.indexOf("{", start);
  if (open === -1) throw new Error("ds-dark: `:root.dark { … }` block not found in dark.css");
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i).trim();
  }
  throw new Error("ds-dark: unbalanced braces in dark.css");
};

export const dsDarkCss = (darkCss: string): string =>
  `@media (prefers-color-scheme: dark) {\n  :root {\n${extractDarkBlock(darkCss)}\n  }\n}`;

/**
 * PostCSS plugin (not a Vite `transform`): `@import "./ds-dark.css"` is inlined by postcss-import,
 * which reads the file itself and never goes through plugin hooks. The marker comment survives the
 * inlining, so it is swapped here, after the import, for the dark block.
 */
export const dsDark = (darkCssPath: string): AcceptedPlugin => ({
  postcssPlugin: "stundio-landing-ds-dark",
  Once(root, { parse }) {
    root.walkComments((comment) => {
      if (`/* ${comment.text} */` !== DS_DARK_MARKER) return;
      comment.replaceWith(
        parse(dsDarkCss(readFileSync(darkCssPath, "utf-8")), { from: darkCssPath }),
      );
    });
  },
});
