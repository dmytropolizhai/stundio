import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  onRequest,
  onRequestGet,
  onRequestHead,
  resolveApkDownloadUrl,
  FALLBACK_DOWNLOAD_URL,
} from "../apk.ts";

describe("Cloudflare Pages Function: /apk redirect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves specific stundio.apk when present in release assets", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          assets: [
            {
              name: "stundio-v1.2.0.apk",
              browser_download_url: "https://example.com/stundio-v1.2.0.apk",
            },
            { name: "stundio.apk", browser_download_url: "https://example.com/stundio.apk" },
          ],
        }),
    });

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe("https://example.com/stundio.apk");
  });

  it("resolves any .apk when stundio.apk is not present", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          assets: [
            { name: "other-file.zip", browser_download_url: "https://example.com/other-file.zip" },
            {
              name: "stundio-v1.1.11-lacplesis.apk",
              browser_download_url: "https://example.com/custom.apk",
            },
          ],
        }),
    });

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe("https://example.com/custom.apk");
  });

  it("falls back to FALLBACK_DOWNLOAD_URL on network failure or rate limit", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("API rate limit exceeded"));

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe(FALLBACK_DOWNLOAD_URL);
  });

  it("falls back to FALLBACK_DOWNLOAD_URL when GitHub returns non-ok response (e.g. 403 or 404)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe(FALLBACK_DOWNLOAD_URL);
  });

  it("falls back to FALLBACK_DOWNLOAD_URL when release has no .apk assets", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          assets: [
            { name: "checksums.txt", browser_download_url: "https://example.com/checksums.txt" },
          ],
        }),
    });

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe(FALLBACK_DOWNLOAD_URL);
  });

  it("falls back to FALLBACK_DOWNLOAD_URL when release assets is not an array or malformed", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ assets: null }),
    });

    const url = await resolveApkDownloadUrl(mockFetch);
    expect(url).toBe(FALLBACK_DOWNLOAD_URL);
  });

  it("returns 302 redirect with Location and Cache-Control headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          assets: [
            { name: "stundio.apk", browser_download_url: "https://example.com/stundio.apk" },
          ],
        }),
    } as Response);

    const res = await onRequestGet();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://example.com/stundio.apk");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("onRequestHead and onRequest work equivalently to onRequestGet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          assets: [
            { name: "stundio.apk", browser_download_url: "https://example.com/stundio.apk" },
          ],
        }),
    } as Response);

    const resHead = await onRequestHead();
    expect(resHead.status).toBe(302);
    expect(resHead.headers.get("Location")).toBe("https://example.com/stundio.apk");

    const resAll = await onRequest();
    expect(resAll.status).toBe(302);
    expect(resAll.headers.get("Location")).toBe("https://example.com/stundio.apk");
  });
});
