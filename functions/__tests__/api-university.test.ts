import { beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest, onRequestOptions, type EventContext } from "../api-university/[[path]].ts";

const ctx = (url: string, init?: RequestInit): EventContext => ({
  request: new Request(url, init),
  params: {},
  env: {},
  waitUntil: vi.fn(),
  next: vi.fn(),
});

describe("Cloudflare Pages Function: api-university proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("answers preflight", async () => {
    expect(onRequestOptions().status).toBe(204);
    const res = await onRequest(ctx("https://s.dev/api-university/rtu/x", { method: "OPTIONS" }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("health-checks on the bare prefix", async () => {
    const res = await onRequest(ctx("https://s.dev/api-university"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("ok");
  });

  it("refuses an unknown university and odd methods", async () => {
    expect((await onRequest(ctx("https://s.dev/api-university/evil.com/x"))).status).toBe(404);
    const res = await onRequest(ctx("https://s.dev/api-university/lu/", { method: "DELETE" }));
    expect(res.status).toBe(405);
  });

  it("forwards an LU GET with its query to the fixed origin", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("<html>", { status: 200, headers: { "set-cookie": "a=b", "x-y": "1" } }),
      );
    const res = await onRequest(
      ctx("https://s.dev/api-university/lu/grupa/G/hronologiski?datums_no=01.10.2026"),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://lekciju-saraksts.lu.lv/grupa/G/hronologiski?datums_no=01.10.2026",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(await res.text()).toBe("<html>");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("forwards an RTU form POST, defaulting to the front page path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]"));
    await onRequest(
      ctx("https://s.dev/api-university/rtu/getSemesterProgEventList", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "semesterProgramId=1&year=2026&month=10",
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://nodarbibas.rtu.lv/getSemesterProgEventList");
    expect(init?.body).toBe("semesterProgramId=1&year=2026&month=10");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );

    await onRequest(ctx("https://s.dev/api-university/rtu", { method: "POST", body: "a=1" }));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://nodarbibas.rtu.lv/");
  });

  it("reports an upstream failure as 502", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    const res = await onRequest(ctx("https://s.dev/api-university/rtu/"));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { detail: string }).detail).toBe("down");
    vi.spyOn(globalThis, "fetch").mockRejectedValue("plain");
    expect((await onRequest(ctx("https://s.dev/api-university/lu/"))).status).toBe(502);
  });
});
