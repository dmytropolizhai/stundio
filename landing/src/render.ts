/*
 * renderPage(lang) — the whole landing as one HTML string, built from the components and the
 * dictionaries. Pure: everything environment-specific (the font CSS, the inline head script,
 * theme colours, which screenshots exist) arrives as `PageAssets`, so tests render real pages
 * with fake assets. The build plugin (build/pages.ts) supplies the real ones.
 *
 * The stylesheet and main script are ordinary `<link>`/`<script src>` references: Vite hashes
 * them, and build/inline-css.ts folds the CSS into the page afterwards.
 */
import { footer } from "./components/footer.ts";
import { finalCta } from "./components/final-cta.ts";
import { header, langNav, skipLink } from "./components/header.ts";
import { hero } from "./components/hero.ts";
import {
  changesSection,
  faqSection,
  installSection,
  moreSection,
  nowSection,
  offlineSection,
  teachersSection,
} from "./components/sections.ts";
import type { ShotAvailability } from "./components/screenshot-frame.ts";
import { stickyCta } from "./components/sticky-cta.ts";
import { LANDING_URL } from "./config.ts";
import { html, type Html } from "./html.ts";
import { createCtx, HTML_LANG, LANGS, langPath, type Ctx, type Lang } from "./i18n/index.ts";

export type PageAssets = {
  /** `@font-face` rules for this language (subsetted per page). */
  readonly fontCss: string;
  /** URLs of the two font files worth preloading (the H1 and body weights). */
  readonly fontPreloads: readonly string[];
  /** Minified inline script that stamps platform/js classes and redirects the first visit. */
  readonly headScript: string;
  readonly themeLight: string;
  readonly themeDark: string;
  readonly shots: ShotAvailability;
};

const OG_LOCALE: Record<Lang, string> = { lv: "lv_LV", ru: "ru_RU", en: "en_GB", ua: "uk_UA" };

const pageUrl = (lang: Lang): string => `${LANDING_URL}${langPath(lang)}`;

const head = (
  ctx: Ctx,
  assets: PageAssets,
  title: string,
  description: string,
  indexable: boolean,
): Html => {
  const { t, lang } = ctx;
  const alternates = LANGS.map(
    (l) => html`<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${pageUrl(l)}" />`,
  );
  return html`<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      ${{ html: assets.headScript }};
    </script>
    <title>${title}</title>
    <meta name="description" content="${description}" />
    ${
      indexable
        ? html`<link rel="canonical" href="${pageUrl(lang)}" />
            ${alternates}
            <link rel="alternate" hreflang="x-default" href="${pageUrl("lv")}" />`
        : html`<meta name="robots" content="noindex" />`
    }
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${t("meta.og.siteName")}" />
    <meta property="og:title" content="${t("meta.og.title")}" />
    <meta property="og:description" content="${t("meta.og.description")}" />
    ${indexable && html`<meta property="og:url" content="${pageUrl(lang)}" />`}
    <meta property="og:locale" content="${OG_LOCALE[lang]}" />
    <meta name="theme-color" content="${assets.themeLight}" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="${assets.themeDark}" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    ${assets.fontPreloads.map(
      (href) => html`<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin />`,
    )}
    <style>
      ${{ html: assets.fontCss }}
    </style>
    <link rel="stylesheet" href="/styles/index.css" />
  </head>`;
};

const document = (
  ctx: Ctx,
  assets: PageAssets,
  title: string,
  description: string,
  body: Html,
  indexable = true,
) =>
  html`<!doctype html>
    <html lang="${HTML_LANG[ctx.lang]}">
      ${head(ctx, assets, title, description, indexable)}
      <body>
        ${body}
        <script type="module" src="/scripts/main.ts"></script>
      </body>
    </html>`.html;

export const renderPage = (lang: Lang, assets: PageAssets): string => {
  const ctx = createCtx(lang);
  const { t } = ctx;
  return document(
    ctx,
    assets,
    t("meta.title"),
    t("meta.description"),
    html`${skipLink(ctx)} ${header(ctx)}
      <main class="l-main" id="main">
        ${hero(ctx)} ${nowSection(ctx, assets.shots)} ${changesSection(ctx)} ${offlineSection(ctx)}
        ${installSection(ctx)} ${teachersSection(ctx)} ${moreSection(ctx)} ${faqSection(ctx)}
        ${finalCta(ctx)}
      </main>
      ${stickyCta(ctx)} ${footer(ctx)}`,
  );
};

/** `404.html` for the landing's own Pages project: Latvian, with a way into every language. */
export const renderNotFound = (assets: PageAssets): string => {
  const ctx = createCtx("lv");
  const { t } = ctx;
  return document(
    ctx,
    assets,
    t("notfound.title"),
    t("meta.description"),
    html`${skipLink(ctx)} ${header(ctx)}
      <main class="l-main l-main--empty" id="main">
        <section class="l-notfound" aria-labelledby="nf-h">
          <h1 id="nf-h" class="l-hero__title">${t("notfound.title")}</h1>
          <p>
            <a class="l-btn l-btn--primary l-btn--lg" href="/"
              ><span>${t("notfound.home")}</span></a
            >
          </p>
          ${langNav(ctx, true)}
        </section>
      </main>`,
    false,
  );
};
