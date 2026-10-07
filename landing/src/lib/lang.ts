/*
 * Language choice for the landing's root page. The rule (01c section 3): walk the browser's
 * preferred languages in order and take the first one we ship — `lv*`, `ru*`, `uk*` (our `ua`),
 * `en*` — otherwise Latvian, the school's language. Only the root page ever redirects, only on a
 * first visit, and a language the visitor picked by hand always wins (see scripts/head.ts).
 */
import { DEFAULT_LANG, LANGS, langPath, type Lang } from "../i18n/index.ts";

const PREFIXES: readonly (readonly [string, Lang])[] = [
  ["lv", "lv"],
  ["ru", "ru"],
  ["uk", "ua"],
  ["en", "en"],
];

export const pickLang = (preferred: readonly string[]): Lang => {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split("-")[0] ?? "";
    const hit = PREFIXES.find(([prefix]) => prefix === primary);
    if (hit) return hit[1];
  }
  return DEFAULT_LANG;
};

export const isLang = (value: string | null | undefined): value is Lang =>
  LANGS.some((l) => l === value);

/** Which language's page is `pathname`? Unknown paths count as Latvian (the root). */
export const langFromPath = (pathname: string): Lang => {
  const first = pathname.split("/")[1] ?? "";
  return isLang(first) && first !== "lv" ? first : DEFAULT_LANG;
};

export const isRootPath = (pathname: string): boolean =>
  pathname === langPath(DEFAULT_LANG) || pathname === "/index.html";

const BOT_UA = /bot|crawl|spider/i;

export type RedirectProbe = {
  readonly pathname: string;
  /** The language stored by a hand-picked choice or an earlier redirect (localStorage). */
  readonly storedLang: string | null;
  /** `sessionStorage` flag: this tab has already been through the decision once. */
  readonly decidedThisSession: boolean;
  readonly referrer: string;
  readonly origin: string;
  readonly webdriver: boolean;
  readonly userAgent: string;
};

/**
 * Should the root page send this visitor to their language? Only a first, direct, human visit:
 * never after a stored or session-level decision, never when the visitor arrived from this very
 * site (a language link, the brand, a back-navigation: that is an explicit choice even when
 * storage is blocked and nothing could be remembered), and never for automation or crawlers.
 */
export const shouldAutoRedirect = (p: RedirectProbe): boolean =>
  isRootPath(p.pathname) &&
  p.storedLang === null &&
  !p.decidedThisSession &&
  !(p.referrer !== "" && p.referrer.startsWith(p.origin + "/")) &&
  !p.webdriver &&
  !BOT_UA.test(p.userAgent);
