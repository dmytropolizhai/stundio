/*
 * The inline head script — runs before first paint, must stay tiny (minified by the page plugin
 * and inlined; budget 1 KB). Three jobs, all of which only ever ENHANCE a page that is already
 * complete without them:
 *  1. mark <html class="js"> so CSS can switch on JS-only UI;
 *  2. stamp <html data-platform> so the right CTA set is visible from the first frame (no flash
 *     of the neutral two-button state);
 *  3. on the root page, on a first direct human visit only, send the visitor to their language
 *     (`shouldAutoRedirect`). A language chosen by hand (stored by scripts/lang-switch.ts), a
 *     same-origin referrer, a session flag and crawlers/automation all suppress it; the URL hash
 *     survives the hop.
 */
import { pickLang, shouldAutoRedirect } from "../lib/lang.ts";
import { detectPlatform, isPlatform, platformFromSearch } from "../lib/platform.ts";
import { langPath } from "../i18n/index.ts";
import { KEYS, readStored, writeStored } from "./storage.ts";

const root = document.documentElement;
root.classList.add("js");

const stored = readStored("session", KEYS.platform);
root.dataset["platform"] =
  platformFromSearch(location.search) ??
  (isPlatform(stored) ? stored : null) ??
  detectPlatform({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });

if (
  shouldAutoRedirect({
    pathname: location.pathname,
    storedLang: readStored("local", KEYS.lang),
    decidedThisSession: readStored("session", KEYS.langDecided) !== null,
    referrer: document.referrer,
    origin: location.origin,
    webdriver: navigator.webdriver === true,
    userAgent: navigator.userAgent,
  })
) {
  const target = pickLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
  writeStored("local", KEYS.lang, target);
  // Without localStorage the flag is what stops the next visit in this tab from redirecting again.
  writeStored("session", KEYS.langDecided, "1");
  if (target !== "lv") location.replace(langPath(target) + location.search + location.hash);
}
