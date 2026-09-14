/**
 * The Capacitor edge of the system-bars layer, mirrored on `lib/share/__tests__/native.test.ts`:
 * Capacitor itself is mocked, and what is checked is that the plugin is only reached for on the
 * platform that has it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ platform: "web", setAppearance: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => state.platform },
  registerPlugin: () => ({ setAppearance: state.setAppearance }),
}));

const { nativeSystemBars } = await import("../native.ts");

beforeEach(() => {
  state.platform = "web";
  state.setAppearance.mockReset();
  state.setAppearance.mockResolvedValue(undefined);
});

describe("nativeSystemBars", () => {
  it("calls the SystemBars plugin on Android", async () => {
    state.platform = "android";

    await nativeSystemBars()?.("dark");

    expect(state.setAppearance).toHaveBeenCalledWith({ style: "dark" });
  });

  it("is absent everywhere else — there is no plugin to call in a browser", () => {
    expect(nativeSystemBars()).toBeNull();
  });
});
