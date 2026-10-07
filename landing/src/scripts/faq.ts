/*
 * FAQ enhancements. `<details>` already works without JS; this opens the question named in the
 * URL hash (`#faq-privacy`) and reports which questions people open, which tells the author
 * what the page failed to answer.
 */
import { track } from "./analytics.ts";

const openFromHash = (): void => {
  if (!location.hash.startsWith("#faq-")) return;
  const item = document.getElementById(location.hash.slice(1));
  if (item instanceof HTMLDetailsElement) {
    item.open = true;
    item.scrollIntoView({ block: "start" });
  }
};

export const initFaq = (): void => {
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
  // `toggle` does not bubble, so listen in the capture phase on the container.
  document.querySelector(".l-faq")?.addEventListener(
    "toggle",
    (event) => {
      const item = event.target;
      if (item instanceof HTMLDetailsElement && item.open) {
        track("FAQ Open", { q: item.id.replace(/^faq-/, "") });
      }
    },
    true,
  );
};
