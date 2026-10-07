/*
 * The landing's page generator, as a Vite plugin. The four language pages (and 404.html) do not
 * exist on disk: this plugin answers Vite's `resolveId`/`load` for their paths with the HTML that
 * `src/render.ts` renders, so they are ordinary HTML entries for Vite (script and stylesheet
 * hashing, minification, tree-shaking) and a dev server serves the same strings with live
 * reload. Alongside them it emits what is not HTML: the per-language subsetted fonts, the QR
 * code of the landing address, sitemap.xml and robots.txt.
 *
 * Everything that needs Node or the design tokens (reading CSS tokens, bundling the head script,
 * subsetting fonts) happens here; `render.ts` stays pure and receives the results as `PageAssets`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build as esbuild } from "esbuild";
import type { Plugin, ViteDevServer } from "vite";
import { SCENE_CHANGES, SCENE_NEXT, SCENE_NOW } from "../src/content/scene.ts";
import { APP_URL, LANDING_ADDRESS_CONFIRMED, LANDING_URL } from "../src/config.ts";
import { DICTIONARIES, LANG_NAMES, LANGS, langPath, type Lang } from "../src/i18n/index.ts";
import { renderNotFound, renderPage, type PageAssets } from "../src/render.ts";
import { buildLangFonts, FONT_URL_PREFIX, type LangFonts } from "./fonts.ts";
import { addressVerdict, qrSvg, readToken, robotsTxt, sitemapXml } from "./meta.ts";

export type PagesOptions = {
  /** `landing/src` — the Vite root. */
  readonly srcRoot: string;
  /** `landing/public` — static files and screenshots. */
  readonly publicDir: string;
  /** Repo root, for the design tokens under `src/ds/tokens`. */
  readonly repoRoot: string;
};

const NOT_FOUND = "404.html";
const pagePath = (lang: Lang): string => (lang === "lv" ? "index.html" : `${lang}/index.html`);

/**
 * Every character a page can show in Manrope, so the font subsets cover it and nothing more:
 * printable ASCII, the page's own dictionary, the fixed scene strings, typographic punctuation,
 * and every language's own name (the footer lists all four on every page).
 */
const corpusFor = (lang: Lang): string => {
  const scene = [SCENE_NOW, SCENE_NEXT, ...SCENE_CHANGES].flatMap((l) => [
    l.subject,
    l.room,
    l.building,
    l.start,
    l.end,
  ]);
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
  return [
    ascii,
    ...Object.values(DICTIONARIES[lang]),
    ...scene,
    ...Object.values(LANG_NAMES),
    "–—·«»„“”’‘…",
  ].join("");
};

const headScript = async (srcRoot: string): Promise<string> => {
  const result = await esbuild({
    entryPoints: [resolve(srcRoot, "scripts/head.ts")],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2019",
    write: false,
    legalComments: "none",
  });
  const text = result.outputFiles[0]?.text.trim();
  if (!text) throw new Error("head script produced no output");
  return text;
};

const shotsAvailable = (publicDir: string): Set<string> => {
  const found = new Set<string>();
  for (const name of ["week-view"]) {
    if (
      ["avif", "webp", "png"].every((ext) => existsSync(resolve(publicDir, `img/${name}.${ext}`)))
    ) {
      found.add(name);
    }
  }
  return found;
};

const collapse = (html: string): string => html.replace(/\s*\n\s*/g, " ").replace(/> </g, "><");

export const landingPages = (opts: PagesOptions): Plugin => {
  const tokens = resolve(opts.repoRoot, "src/ds/tokens");
  let prepared: Promise<{
    fonts: Map<Lang, LangFonts>;
    assets: (lang: Lang) => PageAssets;
    qr: string;
  }> | null = null;

  const prepare = (): NonNullable<typeof prepared> => {
    prepared ??= (async () => {
      const colors = readFileSync(resolve(tokens, "colors.css"), "utf-8");
      const dark = readFileSync(resolve(tokens, "dark.css"), "utf-8");
      const script = await headScript(opts.srcRoot);
      const fonts = new Map<Lang, LangFonts>();
      for (const lang of LANGS) {
        fonts.set(lang, await buildLangFonts(lang, corpusFor(lang), " 0123456789:–.·"));
      }
      const shots = {
        available: shotsAvailable(opts.publicDir),
        placeholders: process.env["LANDING_PLACEHOLDERS"] === "1",
      };
      const assets = (lang: Lang): PageAssets => {
        const f = fonts.get(lang);
        if (!f) throw new Error(`no fonts for ${lang}`);
        return {
          fontCss: f.css,
          fontPreloads: f.preloads,
          headScript: script,
          themeLight: readToken("--bg-app", colors),
          themeDark: readToken("--bg-app", dark),
          shots,
        };
      };
      return { fonts, assets, qr: qrSvg(`${LANDING_URL}/`) };
    })();
    return prepared;
  };

  const ids = new Map<string, Lang | "404">();
  for (const lang of LANGS) ids.set(resolve(opts.srcRoot, pagePath(lang)), lang);
  ids.set(resolve(opts.srcRoot, NOT_FOUND), "404");

  const render = async (which: Lang | "404"): Promise<string> => {
    const { assets } = await prepare();
    return collapse(
      which === "404" ? renderNotFound(assets("lv")) : renderPage(which, assets(which)),
    );
  };

  return {
    name: "stundio-landing-pages",
    enforce: "pre",
    config() {
      return { build: { rollupOptions: { input: [...ids.keys()] } } };
    },
    buildStart() {
      const verdict = addressVerdict(LANDING_ADDRESS_CONFIRMED, process.env);
      if (verdict === "fail") {
        this.error(
          `landing address is a PLACEHOLDER (${LANDING_URL}): set the real origin and ` +
            `LANDING_ADDRESS_CONFIRMED = true in landing/src/config.ts. (CI=true or ` +
            `LANDING_REQUIRE_CONFIRMED=1 refuses to build an unconfirmed address.)`,
        );
      }
      if (verdict === "warn") {
        this.warn(
          `landing address is a PLACEHOLDER (${LANDING_URL}) — canonical, hreflang, sitemap and ` +
            `the QR code are not final until src/config.ts is confirmed. App/CTA target: ${APP_URL}`,
        );
      }
    },
    resolveId(id) {
      return ids.has(id) ? id : null;
    },
    async load(id) {
      const which = ids.get(id);
      return which ? render(which) : null;
    },
    async generateBundle() {
      const { fonts, qr } = await prepare();
      for (const f of fonts.values()) {
        for (const file of f.files) {
          this.emitFile({
            type: "asset",
            fileName: `assets/fonts/${file.name}`,
            source: file.data,
          });
        }
      }
      this.emitFile({ type: "asset", fileName: "qr.svg", source: qr });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        void (async () => {
          const url = (req.url ?? "/").split("?")[0] ?? "/";
          const lang = LANGS.find((l) => url === langPath(l) || url === `/${pagePath(l)}`);
          const which = lang ?? (url === `/${NOT_FOUND}` ? "404" : null);
          if (which) {
            const page = await server.transformIndexHtml(req.url ?? "/", await render(which));
            res.setHeader("Content-Type", "text/html");
            res.end(page);
            return;
          }
          if (url.startsWith(FONT_URL_PREFIX)) {
            const { fonts } = await prepare();
            const name = url.slice(FONT_URL_PREFIX.length);
            for (const f of fonts.values()) {
              const hit = f.files.find((file) => file.name === name);
              if (hit) {
                res.setHeader("Content-Type", "font/woff2");
                res.end(hit.data);
                return;
              }
            }
          }
          if (url === "/qr.svg") {
            res.setHeader("Content-Type", "image/svg+xml");
            res.end((await prepare()).qr);
            return;
          }
          next();
        })().catch(next);
      });
      // The pages are generated from TS, so any source change means a different HTML string.
      server.watcher.on("change", (file) => {
        if (file.includes("/landing/src/") && !file.endsWith(".css")) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
};
