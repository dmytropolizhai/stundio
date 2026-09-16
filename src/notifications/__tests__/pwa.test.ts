import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("PWA Manifest and Service Worker Specifications", () => {
  const rootDir = resolve(__dirname, "../../..");
  const manifestPath = resolve(rootDir, "public/manifest.webmanifest");
  const swPath = resolve(rootDir, "public/sw.js");
  const indexPath = resolve(rootDir, "index.html");

  it("manifest conforms to PWA standards and icon specs", () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      id?: string;
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);

    // Verify icons conform to PWA standards
    const icon192 = manifest.icons.find((i) => i.sizes === "192x192" && i.purpose === "any");
    expect(icon192, "Missing 192x192 icon with purpose: any").toBeDefined();

    const icon512 = manifest.icons.find((i) => i.sizes === "512x512" && i.purpose === "any");
    expect(icon512, "Missing 512x512 icon with purpose: any").toBeDefined();

    const iconMaskable = manifest.icons.find(
      (i) => i.sizes === "512x512" && i.purpose === "maskable",
    );
    expect(iconMaskable, "Missing 512x512 maskable icon with purpose: maskable").toBeDefined();

    // Verify all icon files exist on disk
    for (const icon of manifest.icons) {
      const relPath = icon.src.replace(/^\//, "");
      const fullPath = resolve(rootDir, "public", relPath);
      expect(existsSync(fullPath), `Icon file does not exist: ${icon.src}`).toBe(true);
    }
  });

  it("service worker correctly versions cache and cleans up older shell caches", () => {
    expect(existsSync(swPath)).toBe(true);
    const swCode = readFileSync(swPath, "utf-8");

    // Cache versioning
    expect(swCode).toContain('const CACHE_NAME = "stundio-shell-v2";');

    // Old cache deletion in activate listener
    expect(swCode).toMatch(/caches\s*\.\s*keys\s*\(\)/);
    expect(swCode).toMatch(/key\s*!==\s*CACHE_NAME/);
    expect(swCode).toMatch(/caches\s*\.\s*delete\s*\(\s*key\s*\)/);

    // Precached assets exist
    const precacheMatch = swCode.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
    expect(precacheMatch).toBeTruthy();
    const precachedUrls = (precacheMatch?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter((s) => s.length > 0);

    expect(precachedUrls).toContain("/");
    expect(precachedUrls).toContain("/index.html");
    expect(precachedUrls).toContain("/manifest.webmanifest");
    expect(precachedUrls).toContain("/mark.svg");
    expect(precachedUrls).toContain("/icons/icon-192.png");
    expect(precachedUrls).toContain("/icons/icon-512.png");
    expect(precachedUrls).toContain("/icons/icon-maskable-512.png");

    for (const url of precachedUrls) {
      if (url === "/") continue;
      const relPath = url.replace(/^\//, "");
      const fullPath = url === "/index.html" ? indexPath : resolve(rootDir, "public", relPath);
      expect(existsSync(fullPath), `Precached asset does not exist: ${url}`).toBe(true);
    }

    // Bypass API and sw.js
    expect(swCode).toMatch(/url\.pathname\.startsWith\(["']\/api-/);
    expect(swCode).toMatch(/url\.pathname\s*===\s*["']\/sw\.js["']/);
  });

  it("index.html references valid PWA manifest and apple-touch-icon", () => {
    const html = readFileSync(indexPath, "utf-8");
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(existsSync(resolve(rootDir, "public/icons/apple-touch-icon.png"))).toBe(true);
  });
});
