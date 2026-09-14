/**
 * The Capacitor edge of the connectivity layer. `@capacitor/network` is mocked — what is being
 * checked is that `nativeNetwork` reads and relays its status faithfully and disposes cleanly.
 */
import { describe, expect, it, vi } from "vitest";

type Listener = (status: { connected: boolean }) => void;

const state = vi.hoisted(() => ({
  connected: true,
  addListener: vi.fn<(event: string, fn: Listener) => Promise<{ remove: () => void }>>(),
  getStatus: vi.fn<() => Promise<{ connected: boolean }>>(),
}));

vi.mock("@capacitor/network", () => ({
  Network: { addListener: state.addListener, getStatus: state.getStatus },
}));

const { nativeNetwork } = await import("../native.ts");

describe("nativeNetwork.isOnline", () => {
  it("reads the current status from the plugin", async () => {
    state.getStatus.mockResolvedValue({ connected: true });
    await expect(nativeNetwork.isOnline()).resolves.toBe(true);

    state.getStatus.mockResolvedValue({ connected: false });
    await expect(nativeNetwork.isOnline()).resolves.toBe(false);
  });
});

describe("nativeNetwork.onChange", () => {
  it("relays every networkStatusChange event", () => {
    const remove = vi.fn();
    let listener: Listener = () => undefined;
    state.addListener.mockImplementation((_event, fn) => {
      listener = fn;
      return Promise.resolve({ remove });
    });

    const heard: boolean[] = [];
    nativeNetwork.onChange((online) => heard.push(online));

    listener({ connected: false });
    listener({ connected: true });

    expect(state.addListener).toHaveBeenCalledWith("networkStatusChange", expect.any(Function));
    expect(heard).toEqual([false, true]);
  });

  it("removes the plugin listener on disposal", async () => {
    const remove = vi.fn();
    state.addListener.mockResolvedValue({ remove });

    const dispose = nativeNetwork.onChange(() => undefined);
    dispose();
    await Promise.resolve();

    expect(remove).toHaveBeenCalled();
  });
});
