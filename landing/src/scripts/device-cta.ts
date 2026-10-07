/*
 * DeviceCta enhancements: the "I have an iPhone / Android" override, the "what happens next"
 * panel that opens after the APK link is tapped, and the copy-address button for in-app
 * browsers. The APK link itself is never intercepted — the download proceeds as a normal
 * navigation, the panel just appears next to it.
 */
import { isPlatform } from "../lib/platform.ts";
import { track } from "./analytics.ts";
import { KEYS, writeStored } from "./storage.ts";

const root = document.documentElement;

const setPlatform = (next: string): void => {
  if (!isPlatform(next)) return;
  const from = root.dataset["platform"] ?? "unknown";
  root.dataset["platform"] = next;
  writeStored("session", KEYS.platform, next);
  track("Platform Override", { from, to: next });
};

const focusPrimary = (cta: Element): void => {
  const set = root.dataset["platform"] ?? "neutral";
  cta
    .querySelector<HTMLElement>(
      `[data-set="${set}"] .l-btn--primary, [data-set="${set}"] .l-btn--onField`,
    )
    ?.focus({ preventScroll: true });
};

const initOverride = (): void => {
  document.querySelectorAll<HTMLAnchorElement>("[data-platform-switch]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setPlatform(link.dataset["platformSwitch"] ?? "");
      const cta = link.closest("[data-device-cta]");
      if (cta) focusPrimary(cta);
    });
  });
};

const initAfterApk = (): void => {
  document
    .querySelectorAll<HTMLAnchorElement>('[data-device-cta] [data-cta="apk"]')
    .forEach((link) => {
      link.addEventListener("click", () => {
        link
          .closest("[data-device-cta]")
          ?.querySelector<HTMLElement>("[data-after-apk]")
          ?.removeAttribute("hidden");
      });
    });
};

const initCopy = (): void => {
  if (!navigator.clipboard) return;
  document.querySelectorAll<HTMLButtonElement>("[data-copy-url]").forEach((button) => {
    button.hidden = false;
    const label = button.querySelector("span");
    const original = label?.textContent ?? "";
    const status = button.parentElement?.querySelector<HTMLElement>("[data-copy-status]");
    button.addEventListener("click", () => {
      const address = `${location.origin}${location.pathname}`;
      navigator.clipboard.writeText(address).then(
        () => {
          const done = button.dataset["copied"] ?? "";
          if (label) label.textContent = done;
          if (status) status.textContent = done;
          track("Copy Link", {
            place: button.closest<HTMLElement>("[data-place]")?.dataset["place"] ?? "install",
          });
          window.setTimeout(() => {
            if (label) label.textContent = original;
            if (status) status.textContent = "";
          }, 2000);
        },
        () => undefined,
      );
    });
  });
};

export const initDeviceCta = (): void => {
  initOverride();
  initAfterApk();
  initCopy();
};
