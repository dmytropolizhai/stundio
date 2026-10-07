/*
 * The dark theme is lifted from the DS at build time (build/ds-dark.ts). A unit test of the
 * extraction is not enough — the first version silently shipped a light-only page because the
 * hook never ran on the @import-ed file — so this builds the real pages in memory and checks the
 * FINAL inlined CSS.
 */
import { resolve } from "node:path";
import { build, type Rollup } from "vite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const config = resolve(process.cwd(), "landing/vite.config.ts");

const pages: Record<string, string> = {};

beforeAll(async () => {
  // The placeholder-address guard fails builds in CI; this test is about the CSS, not the address.
  vi.stubEnv("CI", "");
  vi.stubEnv("LANDING_REQUIRE_CONFIRMED", "");
  const result = (await build({
    configFile: config,
    logLevel: "silent",
    build: { write: false },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const outputs = Array.isArray(result) ? result : [result];
  for (const out of outputs) {
    for (const item of out.output) {
      if (item.type === "asset" && item.fileName.endsWith(".html")) {
        pages[item.fileName] = String(item.source);
      }
    }
  }
}, 60_000);

afterAll(() => {
  vi.unstubAllEnvs();
});

/** Everything inside every `@media (prefers-color-scheme:dark){…}` block (brace-balanced). */
const darkBlocks = (html: string): string => {
  const style = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  let out = "";
  for (const m of style.matchAll(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    for (; i < style.length && depth > 0; i++) {
      if (style[i] === "{") depth++;
      else if (style[i] === "}") depth--;
    }
    out += style.slice(from, i);
  }
  return out;
};

describe("built pages: final CSS", () => {
  it("emits all five pages with inlined CSS", () => {
    expect(Object.keys(pages).sort()).toEqual([
      "404.html",
      "en/index.html",
      "index.html",
      "ru/index.html",
      "ua/index.html",
    ]);
  });

  it("carries the DS dark values inside prefers-color-scheme: dark, and no stray marker", () => {
    for (const [name, html] of Object.entries(pages)) {
      const dark = darkBlocks(html).toLowerCase();
      for (const value of ["#16181f", "#101219", "#9ba2b4", "#ff6b5e"]) {
        expect(dark, `${name} ${value}`).toContain(value);
      }
      expect(html, name).not.toContain("@ds-dark");
    }
  });
});
