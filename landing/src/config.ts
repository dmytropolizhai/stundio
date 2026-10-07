/*
 * The one place that names addresses. Everything that points somewhere — CTAs, canonical,
 * hreflang, the QR code, the "open this page on your phone" line, the analytics domain — reads
 * from here, so moving the landing is a one-file change.
 *
 * LANDING_URL is a PLACEHOLDER: the author has not approved an address yet (02-sections.md,
 * open questions). Until `LANDING_ADDRESS_CONFIRMED` is flipped, the build prints a warning and
 * the QR code and canonical must not be treated as final. The app lives on its own origin on
 * purpose — the app's service worker would swallow a landing sharing it (03b section 0, F1).
 */

/** PLACEHOLDER landing origin (a separate Cloudflare Pages project, no trailing slash). */
export const LANDING_URL = "https://stundio-landing.pages.dev";
export const LANDING_ADDRESS_CONFIRMED = false;

/** The web app: "open in browser" CTAs. Never points back at the landing. */
export const APP_URL = "https://stundio.pages.dev/";
/** 302s to the latest release APK (`functions/download.ts`). */
export const DOWNLOAD_URL = "https://stundio.pages.dev/download";

export const GITHUB_URL = "https://github.com/dmytropolizhai/stundio";
export const RELEASES_URL = `${GITHUB_URL}/releases`;
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
export const PRIVACY_URL = `${GITHUB_URL}#privacy`;

/** Host shown to people who must reopen the page in a real browser. */
export const LANDING_HOST = new URL(LANDING_URL).host;
/** Plausible site id — the landing needs its own site in the author's account. */
export const PLAUSIBLE_DOMAIN = LANDING_HOST;
