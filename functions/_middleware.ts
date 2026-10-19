/**
 * Cloudflare Pages middleware: moves visitors from the old `stundio.pages.dev` host to the
 * canonical `app.stundio.lv`, so search engines index one address.
 *
 * Only the production pages.dev host is redirected — branch previews
 * (`<branch>.stundio.pages.dev`) and the custom domain pass through. Left alone on purpose:
 * - non-GET/HEAD requests: a 301 turns a POST into a GET, which would break the
 *   push cron and subscription calls still aimed at the old host;
 * - `/api-*`: clients already installed on the old origin keep talking to their own proxy;
 * - `/sw.js`: the worker registered on the old origin must still be able to update, or it
 *   would keep serving its stale cached shell there forever.
 */
import type { EventContext } from "./download.ts";

export const LEGACY_HOST = "stundio.pages.dev";
export const CANONICAL_ORIGIN = "https://app.stundio.lv";

export const canonicalRedirect = (request: Request): string | null => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.hostname !== LEGACY_HOST) return null;
  if (url.pathname.startsWith("/api-") || url.pathname === "/sw.js") return null;
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
};

export const onRequest = async (context: EventContext): Promise<Response> => {
  const location = canonicalRedirect(context.request);
  if (location === null) return context.next();
  return new Response(null, {
    status: 301,
    headers: { Location: location, "Cache-Control": "public, max-age=3600" },
  });
};
