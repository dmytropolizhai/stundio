/**
 * An iPhone app installed to the Home Screen showed a black band under the tab bar: `100%`/`dvh`
 * stop short of the home-indicator strip there. In standalone mode the root is pinned to all four
 * screen edges instead, so the app covers the full-bleed window whatever height the engine reports.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

describe("standalone viewport", () => {
  it("pins html, body and #root to the screen edges in standalone display mode", () => {
    const block = /@media all and \(display-mode: standalone\) \{[\s\S]*?\n {2}\}/.exec(css)?.[0];
    expect(block).toBeDefined();
    expect(block).toMatch(/html,\s*body,\s*#root/);
    expect(block).toMatch(/position:\s*fixed/);
    expect(block).toMatch(/inset:\s*0/);
  });
});
