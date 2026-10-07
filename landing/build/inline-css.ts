/*
 * Folds the emitted stylesheet into each page's <style> so first paint needs no CSS request
 * (the CSS is a few KB gzip; one RTT is worth more than caching it). Runs after Vite has hashed
 * and minified; stylesheet files that end up referenced nowhere are dropped from the output.
 */
import type { Plugin } from "vite";

const asText = (source: string | Uint8Array): string =>
  typeof source === "string" ? source : Buffer.from(source).toString();

export const inlineCss = (): Plugin => ({
  name: "stundio-landing-inline-css",
  enforce: "post",
  apply: "build",
  generateBundle(_options, bundle) {
    const used = new Set<string>();
    for (const file of Object.values(bundle)) {
      if (file.type !== "asset" || !file.fileName.endsWith(".html")) continue;
      file.source = asText(file.source).replace(
        /<link rel="stylesheet"[^>]*? href="\/([^"]+\.css)"[^>]*>/g,
        (tag, href: string) => {
          const css = bundle[href];
          if (!css || css.type !== "asset") return tag;
          used.add(href);
          return `<style>${asText(css.source)}</style>`;
        },
      );
    }
    for (const href of used) delete bundle[href];
  },
});
