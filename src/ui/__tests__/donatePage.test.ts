/**
 * `public/donate.html` is a hand-written static page outside the Vite build, so nothing else
 * checks it: these tests load it into the DOM, run its inline script and assert the language
 * pick, the switcher and the Ko-fi link.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(resolve(__dirname, "../../../public/donate.html"), "utf-8");
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";

const load = ({ query = "", languages = ["lv"] }: { query?: string; languages?: string[] }) => {
  history.replaceState(null, "", `/donate${query}`);
  vi.stubGlobal("navigator", { ...navigator, languages, language: languages[0] });
  document.documentElement.innerHTML = /<html[^>]*>([\s\S]*)<\/html>/.exec(html)?.[1] ?? "";
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the page's own script
  (new Function(script) as () => void)();
};

const heading = () => document.querySelector("h1")?.textContent;
const pressed = () =>
  document.querySelector<HTMLButtonElement>('[data-lang][aria-pressed="true"]')?.dataset.lang;

describe("donate page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.innerHTML = "";
  });

  it("sends donations to the project's Ko-fi page", () => {
    load({});
    const cta = document.querySelector<HTMLAnchorElement>("a.cta");
    expect(cta?.getAttribute("href")).toBe("https://ko-fi.com/stundio");
    expect(cta?.getAttribute("rel")).toBe("noopener");
  });

  it("follows ?lang= from the app over the browser's language", () => {
    load({ query: "?lang=ru", languages: ["en-US"] });
    expect(heading()).toBe("Поддержать Stundio");
    expect(document.title).toBe("Поддержать Stundio");
    expect(pressed()).toBe("ru");
  });

  it("falls back to the browser's language, mapping ISO uk to the app's ua", () => {
    load({ languages: ["de-DE", "uk-UA"] });
    expect(heading()).toBe("Підтримати Stundio");
    expect(document.documentElement.lang).toBe("uk");
  });

  it("defaults to Latvian for an unknown language or ?lang=", () => {
    load({ query: "?lang=xx", languages: ["de-DE"] });
    expect(heading()).toBe("Atbalsti Stundio");
    expect(pressed()).toBe("lv");
  });

  it("translates every string and remembers a switch in the URL", () => {
    load({});
    document.querySelector<HTMLButtonElement>('[data-lang="en"]')?.click();
    expect(heading()).toBe("Support Stundio");
    expect(location.search).toBe("?lang=en");
    expect(document.querySelector('[data-i18n="kofiCta"]')?.textContent).toBe("Support on Ko-fi");

    // Back to Latvian restores the markup's own copy, so no string is left untranslated.
    document.querySelector<HTMLButtonElement>('[data-lang="lv"]')?.click();
    expect(document.querySelector('[data-i18n="kofiCta"]')?.textContent).toBe("Atbalstīt Ko-fi");
  });
});
