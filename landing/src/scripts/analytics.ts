/*
 * Anonymous page statistics through Plausible's events API — no script tag, no cookies, no
 * persistent id (the same "good citizen" shape as the app's `lib/analytics`). A closed list of
 * event names and property values only (02a section 7): never free text, never the user agent.
 * Nothing is sent before `load`, nothing on localhost, and nothing once the visitor has opted
 * out (the flag is checked on every send, so flipping it takes effect immediately).
 */
import { PLAUSIBLE_DOMAIN } from "../config.ts";
import { isPlace } from "../lib/places.ts";
import { KEYS, readStored } from "./storage.ts";

const EVENT_URL = "https://plausible.io/api/event";

export type EventProps = Readonly<Record<string, string>>;

const isLocal = (): boolean => /^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(location.hostname);

export const analyticsEnabled = (): boolean =>
  readStored("local", KEYS.noAnalytics) !== "1" && !isLocal();

/** Path plus only the campaign parameters worth counting (the share QR's `ref`, UTM). */
const pageUrl = (): string => {
  const params = new URLSearchParams(location.search);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (key === "ref" || key.startsWith("utm_")) kept.set(key, value);
  });
  const query = kept.toString();
  return `${location.origin}${location.pathname}${query ? `?${query}` : ""}`;
};

export const track = (name: string, props?: EventProps): void => {
  if (!analyticsEnabled()) return;
  void fetch(EVENT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    keepalive: true,
    body: JSON.stringify({
      name,
      url: pageUrl(),
      domain: PLAUSIBLE_DOMAIN,
      referrer: document.referrer,
      ...(props ? { props } : {}),
    }),
  }).catch(() => undefined);
};

export const initAnalytics = (): void => {
  const send = (): void => track("pageview");
  if (document.readyState === "complete") send();
  else window.addEventListener("load", send, { once: true });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const cta = target?.closest<HTMLElement>("[data-cta]");
    if (cta) {
      const place =
        cta.closest<HTMLElement>("[data-place]")?.dataset["place"] ?? cta.dataset["place"];
      track("CTA", {
        action: cta.dataset["cta"] ?? "unknown",
        place: isPlace(place) ? place : "unknown",
        platform: document.documentElement.dataset["platform"] ?? "unknown",
      });
    }
    const out = target?.closest<HTMLElement>("[data-outbound]");
    if (out) track("Outbound", { to: out.dataset["outbound"] ?? "unknown" });
  });
};
