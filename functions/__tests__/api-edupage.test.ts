import { describe, expect, it, vi, beforeEach } from "vitest";
import { onRequest, onRequestOptions, type EventContext } from "../api-edupage/[[path]].ts";

describe("Cloudflare Pages Function: api-edupage proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles OPTIONS preflight with CORS headers and status 204", () => {
    const res = onRequestOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("responds to GET /api-edupage with healthcheck ok", async () => {
    const context: EventContext = {
      request: new Request("https://stundio.pages.dev/api-edupage", { method: "GET" }),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe("ok");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects disallowed methods with 405", async () => {
    const context: EventContext = {
      request: new Request("https://stundio.pages.dev/api-edupage/timetable", { method: "DELETE" }),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(405);
  });

  it("rejects invalid subdomain parameter with 400", async () => {
    const context: EventContext = {
      request: new Request("https://stundio.pages.dev/api-edupage/timetable", {
        method: "POST",
        headers: { "x-edupage-subdomain": "bad_subdomain.evil.com" },
      }),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(400);
  });

  it("forwards POST to default pikcrvt.edupage.org with required headers", async () => {
    const upstreamBody = JSON.stringify({ r: { ok: true } });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const context: EventContext = {
      request: new Request(
        "https://stundio.pages.dev/api-edupage/timetable/server/ttviewer.js?__func=getTTViewerData",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ __args: [null, 2026], __gsh: "00000000" }),
        },
      ),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [targetUrl, init] = fetchSpy.mock.calls[0] ?? [];
    const targetUrlStr =
      typeof targetUrl === "string"
        ? targetUrl
        : targetUrl instanceof URL
          ? targetUrl.toString()
          : "";
    expect(targetUrlStr).toBe(
      "https://pikcrvt.edupage.org/timetable/server/ttviewer.js?__func=getTTViewerData",
    );
    const headers = init?.headers as Record<string, string>;
    expect(headers["Referer"]).toBe("https://pikcrvt.edupage.org/");
    expect(headers["User-Agent"]).toContain("rvt-stunda");
  });

  it("supports custom subdomain via header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const context: EventContext = {
      request: new Request("https://stundio.pages.dev/api-edupage/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-edupage-subdomain": "rvt",
        },
        body: "{}",
      }),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(200);
    const [targetUrl, init] = fetchSpy.mock.calls[0] ?? [];
    const targetUrlStr =
      typeof targetUrl === "string"
        ? targetUrl
        : targetUrl instanceof URL
          ? targetUrl.toString()
          : "";
    expect(targetUrlStr).toBe("https://rvt.edupage.org/timetable");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Referer"]).toBe("https://rvt.edupage.org/");
  });

  it("returns 502 on upstream fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network connection error"));

    const context: EventContext = {
      request: new Request("https://stundio.pages.dev/api-edupage/timetable", {
        method: "POST",
        body: "{}",
      }),
      params: {},
      env: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequest(context);
    expect(res.status).toBe(502);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Upstream fetch error");
  });
});
