/*
 * "Do not count my visits": reveals the footer button and keeps a flag in localStorage that
 * `analytics.ts` checks before every send. With no JS the button never appears — and neither
 * does any analytics, so there is nothing to opt out of.
 */
import { KEYS, readStored, writeStored } from "./storage.ts";

export const initOptOut = (): void => {
  const button = document.querySelector<HTMLButtonElement>("[data-optout]");
  if (!button) return;
  const status = button.parentElement?.querySelector<HTMLElement>("[data-optout-status]");
  const render = (): void => {
    const off = readStored("local", KEYS.noAnalytics) === "1";
    button.setAttribute("aria-pressed", off ? "true" : "false");
    if (status) status.textContent = off ? (button.dataset["done"] ?? "") : "";
  };
  button.hidden = false;
  render();
  button.addEventListener("click", () => {
    const off = readStored("local", KEYS.noAnalytics) === "1";
    writeStored("local", KEYS.noAnalytics, off ? "0" : "1");
    render();
  });
};
