import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dsDarkCss, extractDarkBlock } from "./ds-dark.ts";

describe("ds-dark", () => {
  it("lifts the body of :root.dark and re-scopes it to the OS theme", () => {
    const css = ":root.dark {\n  --bg-app: #000;\n  --x: 1px;\n}\n:root { --other: 2; }";
    expect(extractDarkBlock(css)).toBe("--bg-app: #000;\n  --x: 1px;");
    expect(dsDarkCss(css)).toContain("@media (prefers-color-scheme: dark)");
  });

  it("works on the real dark.css and keeps the surface tokens", () => {
    const real = readFileSync(resolve(process.cwd(), "src/ds/tokens/dark.css"), "utf-8");
    const out = dsDarkCss(real);
    expect(out).toContain("--bg-app: #0b0c10");
    expect(out).toContain("--shadow-card");
  });

  it("fails loudly rather than shipping a light-only dark mode", () => {
    expect(() => extractDarkBlock(":root { --a: 1; }")).toThrow(/not found/);
    expect(() => extractDarkBlock(":root.dark { --a: 1;")).toThrow(/unbalanced/);
  });
});
