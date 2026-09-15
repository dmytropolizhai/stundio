/**
 * The two transports. `capacitorHttp` is the real one on device; `fetchHttp` exists for
 * tests and the web preview, where EduPage's missing CORS headers make it useless against
 * the live server (by design — see http.ts).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
const isNativePlatformMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@capacitor/core", () => ({
  CapacitorHttp: { post },
  Capacitor: { isNativePlatform: isNativePlatformMock },
}));

const { USER_AGENT, capacitorHttp, fetchHttp, defaultHttp, isNativePlatform, parseLooseJson } =
  await import("../http.ts");

afterEach(() => {
  vi.restoreAllMocks();
  post.mockReset();
  isNativePlatformMock.mockReset();
  isNativePlatformMock.mockReturnValue(false);
});

describe("capacitorHttp", () => {
  it("posts JSON with the custom User-Agent", async () => {
    post.mockResolvedValue({ status: 200, data: { r: 1 } });
    const res = await capacitorHttp({ url: "https://x/y", body: { a: 1 } });

    expect(res).toEqual({ status: 200, data: { r: 1 } });
    const req = post.mock.calls[0]?.[0] as {
      url: string;
      headers: Record<string, string>;
      data: unknown;
    };
    expect(req.url).toBe("https://x/y");
    expect(req.headers["User-Agent"]).toBe(USER_AGENT);
    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.data).toEqual({ a: 1 });
  });

  it("passes extra headers through", async () => {
    post.mockResolvedValue({ status: 200, data: {} });
    await capacitorHttp({ url: "https://x", body: {}, headers: { Referer: "https://ref/" } });
    const req = post.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(req.headers["Referer"]).toBe("https://ref/");
  });
});

describe("fetchHttp", () => {
  it("serialises the body and parses the response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response('{"r":42}', { status: 200 }));

    const res = await fetchHttp({ url: "https://x", body: { a: 1 }, headers: { Referer: "r" } });

    expect(res).toEqual({ status: 200, data: { r: 42 } });
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"a":1}');
  });

  it("reports a non-2xx status instead of throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await fetchHttp({ url: "https://x", body: {} });
    expect(res.status).toBe(500);
    expect(res.data).toBe("nope");
  });
});

describe("parseLooseJson", () => {
  it("keeps a leading brace intact", () => {
    expect(parseLooseJson('{"r":1}')).toEqual({ r: 1 });
  });
});

describe("defaultHttp and isNativePlatform", () => {
  it("reports platform via isNativePlatform", () => {
    isNativePlatformMock.mockReturnValue(true);
    expect(isNativePlatform()).toBe(true);
    isNativePlatformMock.mockReturnValue(false);
    expect(isNativePlatform()).toBe(false);
  });

  it("routes to capacitorHttp when on native platform", async () => {
    isNativePlatformMock.mockReturnValue(true);
    post.mockResolvedValue({ status: 200, data: { r: 123 } });

    const res = await defaultHttp({ url: "https://native-url", body: { x: 1 } });
    expect(res).toEqual({ status: 200, data: { r: 123 } });
    expect(post).toHaveBeenCalled();
  });

  it("routes to fetchHttp when on web platform", async () => {
    isNativePlatformMock.mockReturnValue(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"r":456}', { status: 200 }));

    const res = await defaultHttp({ url: "/api-edupage/test", body: { y: 2 } });
    expect(res).toEqual({ status: 200, data: { r: 456 } });
    expect(post).not.toHaveBeenCalled();
  });
});
