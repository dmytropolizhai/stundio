/**
 * Cloudflare Pages Function edge proxy for EduPage.
 *
 * EduPage (e.g. `pikcrvt.edupage.org`) emits no CORS headers (`Access-Control-Allow-Origin`)
 * and expects a matching `Referer` header. This stateless edge function runs on Cloudflare's
 * edge network on the same domain as the web app, terminating CORS and proxying server functions
 * to EduPage with the required `Referer` and `User-Agent`.
 *
 * Security:
 * Whitelists target host to `*.edupage.org` (defaulting to `pikcrvt.edupage.org`), preventing
 * open-relay or arbitrary SSRF vulnerabilities.
 */

export type EventContext<Env = Record<string, unknown>> = {
  request: Request;
  params: Record<string, string | string[]>;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
};

const DEFAULT_SUBDOMAIN = "pikcrvt";
const USER_AGENT = "rvt-stunda/0.1 (+https://polizhai.site; personal timetable app)";
const SUBDOMAIN_REGEX = /^[a-zA-Z0-9-]+$/;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edupage-Subdomain",
  "Access-Control-Max-Age": "86400",
};

/** Handles CORS preflight requests. */
export const onRequestOptions = (): Response => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

/**
 * Handles GET (healthcheck/diagnostics) and POST (EduPage server functions).
 */
export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return onRequestOptions();
  }

  const url = new URL(request.url);

  // Health check endpoint
  if (url.pathname === "/api-edupage" || url.pathname === "/api-edupage/") {
    if (request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "edupage-proxy" }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  if (request.method !== "POST" && request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve and validate subdomain
  const subdomainHeader = request.headers.get("x-edupage-subdomain");
  const subdomainQuery = url.searchParams.get("subdomain");
  const subdomain = subdomainHeader || subdomainQuery || DEFAULT_SUBDOMAIN;

  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return new Response(JSON.stringify({ error: "Invalid subdomain parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build target URL: strip /api-edupage prefix and preserve search params
  const targetPath = url.pathname.replace(/^\/api-edupage/, "");
  const targetHost = `${subdomain}.edupage.org`;
  const targetUrl = new URL(`https://${targetHost}${targetPath}${url.search}`);
  // Don't leak the `subdomain` query param to EduPage if it was passed only for the proxy
  targetUrl.searchParams.delete("subdomain");

  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Referer: `https://${targetHost}/`,
    "User-Agent": USER_AGENT,
  };

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: request.method === "POST" ? request.body : undefined,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    // Prevent edge and browser intermediate caching — Stundio controls its own sync cache in IDB
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Upstream fetch error", detail: message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
