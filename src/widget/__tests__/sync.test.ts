/**
 * The refresh button's JS half, with the bridge and publisher injected: the invisible window
 * must be closed on every path, and only a widget-initiated launch may publish or close.
 */
import { describe, expect, it, vi } from "vitest";
import { createFakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache } from "@/db";
import { createSyncEngine } from "@/sync";
import { createAppStore } from "../../store/useAppStore.ts";
import { runWidgetSync } from "@/widget";

const readyStore = async () => {
  const cache = createMemoryCache();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({ http: createFakeServer().http, cache }),
  });
  await store.getState().hydrate();
  return store;
};

const bridge = (requested: boolean) => ({
  isRequested: vi.fn().mockResolvedValue(requested),
  finish: vi.fn().mockResolvedValue(undefined),
});

describe("runWidgetSync", () => {
  it("does nothing off Android", async () => {
    const store = await readyStore();
    await expect(runWidgetSync(store, Promise.resolve(), null)).resolves.toBeUndefined();
  });

  it("leaves a normal launch alone", async () => {
    const store = await readyStore();
    const b = bridge(false);
    const publish = vi.fn();

    await runWidgetSync(store, Promise.resolve(), b, publish);

    expect(publish).not.toHaveBeenCalled();
    expect(b.finish).not.toHaveBeenCalled();
  });

  it("publishes after the refresh, then closes the window", async () => {
    const store = await readyStore();
    const b = bridge(true);
    const order: string[] = [];
    const publish = vi.fn(() => {
      order.push("publish");
      return Promise.resolve();
    });
    b.finish.mockImplementation(() => {
      order.push("finish");
      return Promise.resolve();
    });

    await runWidgetSync(
      store,
      new Promise<void>((resolve) =>
        setTimeout(() => {
          order.push("refresh");
          resolve();
        }, 0),
      ),
      b,
      publish,
    );

    expect(order).toEqual(["refresh", "publish", "finish"]);
  });

  it("closes the window even when the refresh failed", async () => {
    const store = await readyStore();
    const b = bridge(true);

    await expect(
      runWidgetSync(store, Promise.reject(new Error("offline")), b, vi.fn()),
    ).rejects.toThrow("offline");

    expect(b.finish).toHaveBeenCalledOnce();
  });
});
