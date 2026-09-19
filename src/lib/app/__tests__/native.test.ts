/**
 * Tests for lib/app/native.ts — verifying App plugin interaction on Android
 * and safe no-ops on web / non-Android platforms.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  platform: "web",
  addListener: vi.fn(),
  minimizeApp: vi.fn(),
  exitApp: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => state.platform },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: state.addListener,
    minimizeApp: state.minimizeApp,
    exitApp: state.exitApp,
  },
}));

const { nativeApp } = await import("../native.ts");

beforeEach(() => {
  state.platform = "web";
  state.addListener.mockReset();
  state.minimizeApp.mockReset();
  state.exitApp.mockReset();
});

describe("nativeApp", () => {
  describe("addBackButtonListener", () => {
    it("attaches a listener on Android and returns a disposer", async () => {
      state.platform = "android";
      const remove = vi.fn();
      let registeredListener: (() => void) | undefined;
      state.addListener.mockImplementation((_event: string, cb: () => void) => {
        registeredListener = cb;
        return Promise.resolve({ remove });
      });

      const callback = vi.fn();
      const dispose = nativeApp.addBackButtonListener(callback);

      expect(state.addListener).toHaveBeenCalledWith("backButton", expect.any(Function));
      registeredListener?.();
      expect(callback).toHaveBeenCalledTimes(1);

      dispose();
      await Promise.resolve();
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it("returns a no-op disposer and does not register on web", () => {
      state.platform = "web";
      const callback = vi.fn();
      const dispose = nativeApp.addBackButtonListener(callback);

      expect(state.addListener).not.toHaveBeenCalled();
      dispose();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("minimizeApp", () => {
    it("calls App.minimizeApp on Android", async () => {
      state.platform = "android";
      state.minimizeApp.mockResolvedValue(undefined);

      await nativeApp.minimizeApp();

      expect(state.minimizeApp).toHaveBeenCalledTimes(1);
    });

    it("no-ops on web", async () => {
      state.platform = "web";

      await nativeApp.minimizeApp();

      expect(state.minimizeApp).not.toHaveBeenCalled();
    });
  });

  describe("exitApp", () => {
    it("calls App.exitApp on Android", async () => {
      state.platform = "android";
      state.exitApp.mockResolvedValue(undefined);

      await nativeApp.exitApp();

      expect(state.exitApp).toHaveBeenCalledTimes(1);
    });

    it("no-ops on web", async () => {
      state.platform = "web";

      await nativeApp.exitApp();

      expect(state.exitApp).not.toHaveBeenCalled();
    });
  });
});
