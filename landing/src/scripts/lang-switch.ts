/*
 * Language links are plain `<a href>`s. This remembers an explicit choice (so the root page's
 * first-visit redirect never overrides it) and carries the current URL hash into the target, so
 * switching language on `#install-ios` stays on the install steps.
 */
import { track } from "./analytics.ts";
import { KEYS, writeStored } from "./storage.ts";

export const initLangSwitch = (): void => {
  document.querySelectorAll<HTMLAnchorElement>(".l-lang a[data-lang]").forEach((link) => {
    link.addEventListener("click", () => {
      const lang = link.dataset["lang"] ?? "";
      writeStored("local", KEYS.lang, lang);
      writeStored("session", KEYS.langDecided, "1");
      if (location.hash) link.hash = location.hash;
      track("Lang Switch", { to: lang });
    });
  });
};
