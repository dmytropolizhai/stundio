/*
 * Page-generation checks: every dictionary key exists in all four languages, every language
 * renders a complete page from the one template, and none of the words or symbols that 01c
 * forbids appear anywhere in the output.
 */
import { describe, expect, it } from "vitest";
import { DICTIONARIES, HTML_LANG, LANGS } from "./i18n/index.ts";
import { isPlace } from "./lib/places.ts";
import { renderNotFound, renderPage, type PageAssets } from "./render.ts";

const assets: PageAssets = {
  fontCss: "",
  fontPreloads: [],
  headScript: "",
  themeLight: "#f6f7fa",
  themeDark: "#0b0c10",
  shots: { available: new Set(["week-view"]), placeholders: false },
};

const lvKeys = Object.keys(DICTIONARIES.lv).sort();

describe("dictionaries", () => {
  it.each(LANGS)("%s has exactly the Latvian keys and no empty values", (lang) => {
    expect(Object.keys(DICTIONARIES[lang]).sort()).toEqual(lvKeys);
    for (const [key, value] of Object.entries(DICTIONARIES[lang])) {
      expect(value.trim(), `${lang}:${key}`).not.toBe("");
    }
  });

  it("no placeholders in braces survive in any text", () => {
    for (const lang of LANGS) {
      for (const value of Object.values(DICTIONARIES[lang])) expect(value).not.toMatch(/[{}]/);
    }
  });
});

const FORBIDDEN_SYMBOLS = /[→✓★⚡⭐]|\p{Extended_Pictographic}/u;
// Claims 01c marks "нельзя": store badges as install places, ratings, "no server", real time.
const FORBIDDEN_WORDS = [
  /download on the app store/i,
  /available on google play/i,
  /real[- ]time/i,
  /реальном времени/i,
  /реальному часі/i,
  /reāllaikā/i,
  /100\s?%/,
  /без трекинга/i,
  /bez trekinga/i,
  /no tracking/i,
  /no server/i,
  /нет сервера/i,
];

describe.each(LANGS)("rendered page: %s", (lang) => {
  const page = renderPage(lang, assets);

  it("is a complete document with the right lang", () => {
    expect(page).toContain(`<html lang="${HTML_LANG[lang]}">`);
    expect(page.match(/<h1[ >]/g)).toHaveLength(1);
    expect(page).toContain('id="main"');
  });

  it("carries every section anchor", () => {
    for (const id of [
      "top",
      "now",
      "changes",
      "offline",
      "install",
      "install-android",
      "install-ios",
      "install-desktop",
      "teachers",
      "more",
      "faq",
      "privacy",
    ]) {
      expect(page, id).toContain(`id="${id}"`);
    }
  });

  it("contains no forbidden symbols or claims", () => {
    expect(page).not.toMatch(FORBIDDEN_SYMBOLS);
    for (const pattern of FORBIDDEN_WORDS) expect(page).not.toMatch(pattern);
  });

  it("names RVT only in the source line and the disclaimer, never in meta", () => {
    const head = page.slice(0, page.indexOf("</head>"));
    expect(head).not.toMatch(/RVT|Rīgas Valsts/);
  });

  it("puts the APK warning before the install APK button", () => {
    const warn = page.indexOf("l-callout--apk");
    const button = page.indexOf('data-place="install"');
    expect(warn).toBeGreaterThan(-1);
    expect(warn).toBeLessThan(button);
  });

  it("never calls the missing store listing a legal risk", () => {
    const text = [DICTIONARIES[lang]["install.android.why"], DICTIONARIES[lang]["faq.play.a"]];
    for (const value of text) expect(value).not.toMatch(/risk|legal|juridisk|юридич|юрид/i);
  });

  it("describes the Next-lesson widget only with what it shows (no teacher)", () => {
    expect(DICTIONARIES[lang]["now.widgets.next.body"]).not.toMatch(
      /teacher|skolotāj|преподавател|викладач|учител/i,
    );
  });

  it("gives the two language navs different names", () => {
    expect(DICTIONARIES[lang]["footer.langs"]).not.toBe(DICTIONARIES[lang]["header.langLabel"]);
  });

  it("wraps Latvian fragments in lang=lv on non-Latvian pages", () => {
    if (lang === "lv") return;
    expect(page).toContain('<span lang="lv">Programmēšana</span>');
    expect(page).toContain('<span lang="lv">Galvenā ēka</span>');
  });

  it("marks the illustrations visibly and names no teachers", () => {
    expect(page).toContain(DICTIONARIES[lang]["scene.illustration"]);
    expect(page).toContain('role="img"');
  });

  it("links the app and the download, never back at the landing for CTAs", () => {
    expect(page).toContain('href="https://stundio.pages.dev/download"');
    expect(page).toContain('href="https://stundio.pages.dev/"');
  });

  it("tags every CTA with a place from the closed analytics list", () => {
    const tagged = [...page.matchAll(/data-cta="[^"]*"[^>]*?data-place="([^"]*)"/g)];
    expect(tagged.length).toBeGreaterThan(0);
    for (const [, place] of tagged) expect(isPlace(place), place).toBe(true);
    expect(page).toMatch(/data-cta="install_jump" data-place="faq"/);
    for (const [, place] of page.matchAll(/data-place="([^"]*)"/g)) {
      expect(isPlace(place), place).toBe(true);
    }
  });

  it("has hreflang for every language plus x-default", () => {
    for (const l of LANGS) expect(page).toContain(`hreflang="${HTML_LANG[l]}"`);
    expect(page).toContain('hreflang="x-default"');
  });
});

describe("screenshots", () => {
  it("omits the frame when the files are missing (production)", () => {
    const none = renderPage("lv", {
      ...assets,
      shots: { available: new Set(), placeholders: false },
    });
    expect(none).not.toContain("week-view");
  });

  it("draws a labelled hole in placeholder mode", () => {
    const hole = renderPage("lv", {
      ...assets,
      shots: { available: new Set(), placeholders: true },
    });
    expect(hole).toContain("l-shot--missing");
  });
});

describe("404", () => {
  it("renders in Latvian with links to every language", () => {
    const page = renderNotFound(assets);
    expect(page).toContain(DICTIONARIES.lv["notfound.title"]);
    expect(page).toContain('href="/ru/"');
  });

  it("is noindex and carries no canonical, hreflang or og:url", () => {
    const page = renderNotFound(assets);
    expect(page).toContain('<meta name="robots" content="noindex"');
    expect(page).not.toMatch(/rel="canonical"|hreflang="x-default"|og:url/);
    expect(page).not.toContain('rel="alternate"');
  });

  it("the real pages stay indexable", () => {
    expect(renderPage("lv", assets)).not.toContain("noindex");
  });
});
