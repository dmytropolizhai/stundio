/**
 * Cloudflare Pages Function edge proxy for the university timetables (MODEL-UNIVERSITY.md).
 *
 * Neither `nodarbibas.rtu.lv` nor `lekciju-saraksts.lu.lv` sends CORS headers, so the web
 * build reaches them as `/api-university/{rtu|lu}/<path>`, the same way `/api-edupage`
 * fronts EduPage. Android calls them directly through CapacitorHttp and never comes here.
 *
 * Security: the first path segment picks one of two fixed origins — nothing in the request
 * can name another host, so this is not an open relay. Only GET (LU pages, RTU's front page)
 * and form POST (RTU's data calls) are forwarded, with no cookies either way.
 */

export type EventContext<Env = Record<string, unknown>> = {
  request: Request;
  params: Record<string, string | string[]>;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
};

const ORIGINS: Record<string, string> = {
  rtu: "https://nodarbibas.rtu.lv",
  lu: "https://lekciju-saraksts.lu.lv",
};

const USER_AGENT = "rvt-stunda/0.1 (+https://polizhai.site; personal timetable app)";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const onRequestOptions = (): Response =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request } = context;
  if (request.method === "OPTIONS") return onRequestOptions();

  const url = new URL(request.url);
  const rest = url.pathname.replace(/^\/api-university\/?/, "");
  const slash = rest.indexOf("/");
  const university = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? "/" : rest.slice(slash);

  if (university === "" && request.method === "GET") {
    return json(200, { status: "ok", service: "university-proxy" });
  }
  const origin = ORIGINS[university];
  if (origin === undefined) return json(404, { error: "Unknown university" });
  if (request.method !== "GET" && request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const headers: Record<string, string> = {
    Referer: `${origin}/`,
    "User-Agent": USER_AGENT,
  };
  const contentType = request.headers.get("content-type");
  if (request.method === "POST") {
    headers["Content-Type"] = contentType ?? "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  try {
    const upstream = await fetch(`${origin}${path}${url.search}`, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(corsHeaders)) responseHeaders.set(key, value);
    // Upstream cookies are never wanted by the app and must not land on our domain.
    responseHeaders.delete("set-cookie");
    // Stundio caches in IndexedDB itself; intermediate caches would only serve stale weeks.
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json(502, { error: "Upstream fetch error", detail: message });
  }
};
