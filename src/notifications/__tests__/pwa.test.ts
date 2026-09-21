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
    expect(swCode).toContain('const CACHE_NAME = "stundio-shell-v3";');

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
    expect(precachedUrls).toContain("/icons/apple-touch-icon-180.png");
    expect(precachedUrls).toContain("/apple-touch-icon.png");
    expect(precachedUrls).toContain("/favicon.ico");

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

  it("index.html references valid PWA manifest and apple-touch-icons", () => {
    const html = readFileSync(indexPath, "utf-8");
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png"');

    for (const size of [180, 167, 152]) {
      expect(html).toContain(
        `<link rel="apple-touch-icon" sizes="${size}x${size}" href="/icons/apple-touch-icon-${size}.png"`,
      );
      expect(existsSync(resolve(rootDir, `public/icons/apple-touch-icon-${size}.png`))).toBe(true);
    }

    expect(existsSync(resolve(rootDir, "public/icons/apple-touch-icon.png"))).toBe(true);

    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain(
      '<meta name="google-site-verification" content="kTGVB54XhxyR5GTBg6vm2fv982s3msWHykFb7-qJpCU" />',
    );
  });

  // Browsers probe these root paths by convention — iOS the two apple-touch-icons
  // when it captures a home-screen icon, everything else /favicon.ico. On a SPA host
  // every unknown path answers 200 with index.html, so without real files here the
  // client receives HTML where it expects an image. iOS then fails to decode it and
  // falls back to a snapshot of the not-yet-painted page: the pure black icon.
  it("serves real icon files at the root paths browsers probe", () => {
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // An .ico starts with a 6-byte ICONDIR: reserved 0, type 1, then the image count.
    const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

    const rootIcons: Array<[string, Buffer]> = [
      ["apple-touch-icon.png", PNG_MAGIC],
      ["apple-touch-icon-precomposed.png", PNG_MAGIC],
      ["favicon.ico", ICO_MAGIC],
    ];

    for (const [name, magic] of rootIcons) {
      const iconPath = resolve(rootDir, "public", name);
      expect(existsSync(iconPath), `Missing root icon: /${name}`).toBe(true);
      expect(
        readFileSync(iconPath).subarray(0, magic.length),
        `/${name} is not a real image`,
      ).toEqual(magic);
    }
  });

  // iOS composites any transparency onto black, so an apple-touch-icon with an
  // alpha channel renders as a black (or black-cornered) tile. PNG colour type 2
  // is truecolour without alpha; 6 is truecolour with alpha.
  it("ships opaque, correctly sized apple-touch-icons", () => {
    const icons: Array<[string, number]> = [
      ["public/apple-touch-icon.png", 180],
      ["public/apple-touch-icon-precomposed.png", 180],
      ["public/icons/apple-touch-icon.png", 180],
      ["public/icons/apple-touch-icon-180.png", 180],
      ["public/icons/apple-touch-icon-167.png", 167],
      ["public/icons/apple-touch-icon-152.png", 152],
    ];

    for (const [relPath, expectedSize] of icons) {
      const png = readFileSync(resolve(rootDir, relPath));
      // IHDR payload starts at byte 16: width, height, bit depth, colour type.
      expect(png.readUInt32BE(16), `${relPath} width`).toBe(expectedSize);
      expect(png.readUInt32BE(20), `${relPath} height`).toBe(expectedSize);
      expect(png.readUInt8(25), `${relPath} must have no alpha channel`).toBe(2);
    }
  });
});
