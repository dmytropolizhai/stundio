/**
 * The two transports. `capacitorHttp` is the real one on device; `fetchHttp` exists for
 * tests and the web preview, where EduPage's missing CORS headers make it useless against
 * the live server (by design — see http.ts).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("@capacitor/core", () => ({ CapacitorHttp: { post } }));

const { USER_AGENT, capacitorHttp, fetchHttp, parseLooseJson } = await import("../http.ts");

afterEach(() => {
  vi.restoreAllMocks();
  post.mockReset();
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
