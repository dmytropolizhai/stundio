/*
 * Build-time metadata helpers: theme-color read from the design tokens (never typed by hand),
 * sitemap/robots, and the QR code SVG for the landing address. Pure functions — the plugin in
 * pages.ts decides when to call them.
 */
import { LANDING_URL } from "../src/config.ts";
import { HTML_LANG, LANGS, langPath } from "../src/i18n/index.ts";
import { encodeQr } from "../../src/lib/share/qr.ts";

/** Value of a custom property, following `var(--other)` aliases (a few hops at most). */
export const readToken = (name: string, ...sources: readonly string[]): string => {
  const find = (token: string): string | undefined => {
    for (const source of sources) {
      const match = new RegExp(`${token}\\s*:\\s*([^;]+);`).exec(source);
      if (match?.[1]) return match[1].trim();
    }
    return undefined;
  };
  let value = find(name);
  for (let hops = 0; value?.startsWith("var(") && hops < 4; hops++) {
    const inner = /var\((--[\w-]+)\)/.exec(value)?.[1];
    value = inner ? find(inner) : undefined;
  }
  if (!value) throw new Error(`token ${name} not found`);
  return value;
};

export const sitemapXml = (): string => {
  const alternates = LANGS.map(
    (l) =>
      `<xhtml:link rel="alternate" hreflang="${HTML_LANG[l]}" href="${LANDING_URL}${langPath(l)}"/>`,
  ).concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${LANDING_URL}/"/>`);
  const urls = LANGS.map(
    (l) => `<url><loc>${LANDING_URL}${langPath(l)}</loc>${alternates.join("")}</url>`,
  );
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>\n`
  );
};

export const robotsTxt = (): string =>
  `User-agent: *\nAllow: /\nSitemap: ${LANDING_URL}/sitemap.xml\n`;

/**
 * The address as one `<path>` of unit squares plus a 4-module quiet zone. Black on white by
 * keyword: a QR only scans dark-on-light, whatever the page theme (this file is its own image).
 */
export const qrSvg = (text: string): string => {
  const matrix = encodeQr(text);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/>` +
    `<path d="${path}" fill="black"/></svg>\n`
  );
};

export type AddressVerdict = "ok" | "warn" | "fail";

/**
 * What to do about the landing address. Unconfirmed is a warning on a developer's machine and an
 * error in CI or when `LANDING_REQUIRE_CONFIRMED=1`: a placeholder must never reach production.
 */
export const addressVerdict = (
  confirmed: boolean,
  env: Readonly<Record<string, string | undefined>>,
): AddressVerdict => {
  if (confirmed) return "ok";
  const strict = (v: string | undefined): boolean => v === "1" || v === "true";
  return strict(env["CI"]) || strict(env["LANDING_REQUIRE_CONFIRMED"]) ? "fail" : "warn";
};
