import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_URL } from "../src/config.ts";
import { addressVerdict, qrSvg, readToken, robotsTxt, sitemapXml } from "./meta.ts";

const tokens = (name: string): string =>
  readFileSync(resolve(process.cwd(), `src/ds/tokens/${name}`), "utf-8");

describe("readToken", () => {
  it("follows var() aliases to a value", () => {
    expect(readToken("--bg-app", tokens("colors.css"))).toBe("#f6f7fa");
  });

  it("reads a direct value from the dark file", () => {
    expect(readToken("--bg-app", tokens("dark.css"))).toBe("#0b0c10");
  });

  it("throws for an unknown token", () => {
    expect(() => readToken("--nope", tokens("colors.css"))).toThrow(/not found/);
  });
});

describe("sitemap and robots", () => {
  it("lists all four languages with alternates and x-default", () => {
    const xml = sitemapXml();
    for (const path of ["/", "/ru/", "/en/", "/ua/"])
      expect(xml).toContain(`<loc>${LANDING_URL}${path}</loc>`);
    expect(xml).toContain('hreflang="uk"');
    expect(xml).toContain('hreflang="x-default"');
  });

  it("robots points at the sitemap", () => {
    expect(robotsTxt()).toContain(`Sitemap: ${LANDING_URL}/sitemap.xml`);
  });
});

describe("qrSvg", () => {
  it("draws a square viewBox with a quiet zone", () => {
    const svg = qrSvg(`${LANDING_URL}/`);
    const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
    expect(size).toBeGreaterThan(8 * 2 + 20);
    expect(svg).toContain("<path");
  });
});

describe("addressVerdict", () => {
  it("passes a confirmed address everywhere", () => {
    expect(addressVerdict(true, { CI: "true" })).toBe("ok");
  });

  it("warns locally, fails in CI or when asked", () => {
    expect(addressVerdict(false, {})).toBe("warn");
    expect(addressVerdict(false, { CI: "false" })).toBe("warn");
    expect(addressVerdict(false, { CI: "true" })).toBe("fail");
    expect(addressVerdict(false, { LANDING_REQUIRE_CONFIRMED: "1" })).toBe("fail");
  });
});
