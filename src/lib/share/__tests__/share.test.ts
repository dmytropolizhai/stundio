/**
 * Which way the finished PNG leaves the app. The device path is the one that matters, but the
 * fallbacks are what make `npm run dev` on a phone or a laptop usable — so all three are pinned.
 */
import { describe, expect, it, vi } from "vitest";
import { base64ToBlob, shareImage, type ShareEnvironment } from "../share.ts";

/** "ABC" — small enough to assert on byte for byte. */
const PAYLOAD = {
  base64: "QUJD",
  fileName: "stundio-a1-2-2026-09-07.png",
  title: "A1-2 stundu saraksts",
  text: "A1-2 stundu saraksts 07.09.–11.09.\nhttps://github.com/dmytropolizhai/stundio/releases",
};

const environment = (overrides: Partial<ShareEnvironment> = {}): ShareEnvironment => ({
  native: null,
  navigator: null,
  download: null,
  ...overrides,
});

describe("base64ToBlob", () => {
  it("decodes without going near the network", async () => {
    const blob = base64ToBlob("QUJD");
    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("ABC");
  });
});

describe("shareImage", () => {
  it("prefers the native share sheet and hands it the payload untouched", async () => {
    const native = vi.fn().mockResolvedValue(undefined);

    await expect(shareImage(PAYLOAD, environment({ native }))).resolves.toBe("native");
    expect(native).toHaveBeenCalledWith(PAYLOAD);
  });

  it("falls back to the Web Share API with the image attached", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);

    await expect(
      shareImage(PAYLOAD, environment({ navigator: { share, canShare } })),
    ).resolves.toBe("web-share");

    const sent = share.mock.calls[0]?.[0] as { files: File[]; text: string };
    expect(sent.files[0]?.name).toBe(PAYLOAD.fileName);
    expect(sent.text).toContain("github.com/dmytropolizhai/stundio/releases");
  });

  it("does not try to send a file to a browser that only shares text", async () => {
    const share = vi.fn();
    const download = vi.fn();

    await expect(
      shareImage(PAYLOAD, environment({ navigator: { share, canShare: () => false }, download })),
    ).resolves.toBe("download");

    expect(share).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledWith(expect.any(Blob), PAYLOAD.fileName);
  });

  it("saves the file when there is no share sheet at all", async () => {
    const download = vi.fn();
    await expect(shareImage(PAYLOAD, environment({ download }))).resolves.toBe("download");
  });

  it("says so when the platform can do none of the three", async () => {
    await expect(shareImage(PAYLOAD, environment())).rejects.toThrow(/not supported/);
  });

  it("lets a cancelled share reject, so the caller can tell it apart from a failure", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const navigator = { share: vi.fn().mockRejectedValue(abort), canShare: () => true };

    await expect(shareImage(PAYLOAD, environment({ navigator }))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
