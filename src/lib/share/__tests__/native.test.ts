/**
 * The Capacitor edge of the share layer. Capacitor itself is mocked — what is being checked is
 * that the app only reaches for the native plugin on the platform that has it, and that the
 * browser environment is assembled from what the page actually offers.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ platform: "web", share: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => state.platform },
  registerPlugin: () => ({ share: state.share }),
}));

const { nativeShare } = await import("../native.ts");
const { browserShareEnvironment } = await import("../share.ts");

beforeEach(() => {
  state.platform = "web";
  state.share.mockReset();
  state.share.mockResolvedValue(undefined);
});

describe("nativeShare", () => {
  it("calls the ImageShare plugin on Android", async () => {
    state.platform = "android";
    const payload = { base64: "QUJD", fileName: "a.png", title: "t", text: "x" };

    await nativeShare()?.(payload);

    expect(state.share).toHaveBeenCalledWith(payload);
  });

  it("is absent everywhere else — there is no plugin to call in a browser", () => {
    expect(nativeShare()).toBeNull();
  });
});

describe("browserShareEnvironment", () => {
  it("offers the page's own navigator and a file save when there is no device", () => {
    const environment = browserShareEnvironment();

    expect(environment.native).toBeNull();
    expect(environment.navigator).toBe(navigator);
    expect(environment.download).not.toBeNull();
  });

  it("prefers the native sheet on the device", () => {
    state.platform = "android";
    expect(browserShareEnvironment().native).not.toBeNull();
  });

  it("saves through an object URL, and releases it again", () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    browserShareEnvironment().download?.(new Blob(["ABC"]), "week.png");

    expect(create).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith("blob:x");

    create.mockRestore();
    revoke.mockRestore();
  });
});
