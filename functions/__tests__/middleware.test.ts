import { describe, expect, it, vi } from "vitest";
import { canonicalRedirect, onRequest } from "../_middleware.ts";
import type { EventContext } from "../download.ts";

const contextFor = (url: string, method = "GET"): EventContext => ({
  request: new Request(url, { method }),
  params: {},
  env: {},
  waitUntil: vi.fn(),
  next: vi.fn(() => Promise.resolve(new Response("next"))),
});

describe("Cloudflare Pages middleware: canonical host redirect", () => {
  it("301s pages.dev pages to app.stundio.lv, keeping path and query", async () => {
    const context = contextFor("https://stundio.pages.dev/download?x=1");
    const res = await onRequest(context);
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://app.stundio.lv/download?x=1");
    expect(context.next).not.toHaveBeenCalled();
  });

  it("redirects the root and HEAD requests", () => {
    expect(canonicalRedirect(new Request("https://stundio.pages.dev/"))).toBe(
      "https://app.stundio.lv/",
    );
    expect(canonicalRedirect(new Request("https://stundio.pages.dev/", { method: "HEAD" }))).toBe(
      "https://app.stundio.lv/",
    );
  });

  it.each([
    ["the canonical host", "https://app.stundio.lv/", "GET"],
    ["a branch preview", "https://feat-x.stundio.pages.dev/", "GET"],
    ["the API proxy", "https://stundio.pages.dev/api-edupage/timetable", "GET"],
    ["the push cron", "https://stundio.pages.dev/api-push/cron", "POST"],
    ["a non-GET request", "https://stundio.pages.dev/", "POST"],
    ["the service worker", "https://stundio.pages.dev/sw.js", "GET"],
  ])("passes %s through", async (_, url, method) => {
    const context = contextFor(url, method);
    const res = await onRequest(context);
    expect(await res.text()).toBe("next");
    expect(context.next).toHaveBeenCalledOnce();
  });
});
