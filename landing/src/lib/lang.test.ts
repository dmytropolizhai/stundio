import { describe, expect, it } from "vitest";
import {
  isLang,
  isRootPath,
  langFromPath,
  pickLang,
  shouldAutoRedirect,
  type RedirectProbe,
} from "./lang.ts";

describe("pickLang", () => {
  it("takes the first language we ship, in the visitor's order", () => {
    expect(pickLang(["ru-RU", "en"])).toBe("ru");
    expect(pickLang(["en-GB", "lv"])).toBe("en");
    expect(pickLang(["lv-LV"])).toBe("lv");
  });

  it("maps Ukrainian (uk) to our internal ua", () => {
    expect(pickLang(["uk-UA", "ru"])).toBe("ua");
  });

  it("skips languages we do not ship, and falls back to Latvian", () => {
    expect(pickLang(["de-DE", "ru"])).toBe("ru");
    expect(pickLang(["de-DE", "fr"])).toBe("lv");
    expect(pickLang([])).toBe("lv");
  });

  it("is case-insensitive", () => {
    expect(pickLang(["RU-ru"])).toBe("ru");
  });
});

describe("paths", () => {
  it("knows the language of a page path", () => {
    expect(langFromPath("/")).toBe("lv");
    expect(langFromPath("/ru/")).toBe("ru");
    expect(langFromPath("/en/index.html")).toBe("en");
    expect(langFromPath("/ua/")).toBe("ua");
    expect(langFromPath("/lv/")).toBe("lv");
    expect(langFromPath("/nowhere/")).toBe("lv");
  });

  it("only the root counts as the redirecting page", () => {
    expect(isRootPath("/")).toBe(true);
    expect(isRootPath("/index.html")).toBe(true);
    expect(isRootPath("/ru/")).toBe(false);
  });

  it("isLang guards the four codes", () => {
    expect(isLang("ua")).toBe(true);
    expect(isLang("uk")).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});

describe("shouldAutoRedirect", () => {
  const first: RedirectProbe = {
    pathname: "/",
    storedLang: null,
    decidedThisSession: false,
    referrer: "",
    origin: "https://stundio-landing.pages.dev",
    webdriver: false,
    userAgent: "Mozilla/5.0 (iPhone) Safari",
  };

  it("redirects a first direct human visit to the root", () => {
    expect(shouldAutoRedirect(first)).toBe(true);
    expect(shouldAutoRedirect({ ...first, referrer: "https://t.me/x" })).toBe(true);
  });

  it("never redirects off the root page", () => {
    expect(shouldAutoRedirect({ ...first, pathname: "/ru/" })).toBe(false);
  });

  it("respects a stored choice and the session flag (storage-less browsers)", () => {
    expect(shouldAutoRedirect({ ...first, storedLang: "lv" })).toBe(false);
    expect(shouldAutoRedirect({ ...first, decidedThisSession: true })).toBe(false);
  });

  it("treats a same-origin referrer as an explicit choice", () => {
    expect(
      shouldAutoRedirect({ ...first, referrer: "https://stundio-landing.pages.dev/ru/#install" }),
    ).toBe(false);
    // a lookalike host is not the same origin
    expect(
      shouldAutoRedirect({ ...first, referrer: "https://stundio-landing.pages.dev.evil/" }),
    ).toBe(true);
  });

  it("leaves crawlers and automation alone", () => {
    expect(shouldAutoRedirect({ ...first, webdriver: true })).toBe(false);
    for (const ua of [
      "Googlebot/2.1",
      "Mozilla/5.0 (compatible; bingbot)",
      "SomeCrawler",
      "Yandex spider",
    ]) {
      expect(shouldAutoRedirect({ ...first, userAgent: ua }), ua).toBe(false);
    }
  });
});
