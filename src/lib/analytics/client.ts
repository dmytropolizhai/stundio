/**
 * A thin wrapper around Plausible's events API (https://plausible.io/docs/events-api).
 *
 * Plausible has no cookies and no persistent visitor id, so this needs no consent banner —
 * it fits the same "be a good citizen" spirit as `lib/edupage`. There is no JS snippet to drop
 * in either: the app has no web pages, so every screen view is a manual API call with a
 * synthetic `app://` URL standing in for a page path.
 *
 * Never throws and never awaited by callers — a dropped event is not worth surfacing to the
 * user, let alone blocking a screen transition on.
 */
import type { HttpClient } from "./http.ts";

export type AnalyticsClient = { track: (event: string) => void };

const PLAUSIBLE_EVENT_URL = "https://plausible.io/api/event";

export const createAnalyticsClient = (http: HttpClient, domain: string): AnalyticsClient => ({
  track: (event) => {
    void http(PLAUSIBLE_EVENT_URL, {
      domain,
      name: event,
      url: `app://${domain}/${event}`,
    }).catch(() => undefined);
  },
});

/** Used whenever tracking is off (user opt-out, or no client wired in tests). */
export const noopAnalytics: AnalyticsClient = { track: () => undefined };
