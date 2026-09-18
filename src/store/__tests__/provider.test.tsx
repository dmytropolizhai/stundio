/**
 * The provider's contract: nothing renders until the store exists, and once it does the
 * hook reads live state. Boot wiring (real cache + Capacitor http) is exercised on device;
 * here an injected store keeps it deterministic.
 */
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AppStoreProvider } from "../provider.tsx";
import { useAppStore } from "../context.ts";
import { createAppStore } from "../useAppStore.ts";
import { createMemoryCache } from "@/db";
import { createSyncEngine } from "@/sync";
import { createFakeServer } from "../../sync/__tests__/fakeServer.ts";

const makeStore = () => {
  const cache = createMemoryCache();
  return createAppStore({
    cache,
    engine: createSyncEngine({
      http: createFakeServer().http,
      cache,
      now: () => new Date("2026-09-09T08:00:00Z"),
    }),
  });
};

const Status = () => {
  const status = useAppStore((s) => s.syncStatus);
  return <span>status:{status}</span>;
};

/** A boot that never settles, standing in for "the cache is still opening". */
const pendingBoot = () => new Promise<never>(() => undefined);

describe("AppStoreProvider", () => {
  it("renders only the fallback until boot resolves", () => {
    render(
      <AppStoreProvider boot={pendingBoot} fallback={<span>loading</span>}>
        <Status />
      </AppStoreProvider>,
    );
    expect(screen.getByText("loading")).toBeDefined();
    expect(screen.queryByText(/status:/)).toBeNull();
  });

  it("renders children once boot resolves", async () => {
    const store = makeStore();
    render(
      <AppStoreProvider boot={() => Promise.resolve({ store })} fallback={<span>loading</span>}>
        <Status />
      </AppStoreProvider>,
    );
    expect(await screen.findByText("status:idle")).toBeDefined();
  });

  it("re-renders when store state changes", async () => {
    const store = makeStore();
    render(
      <AppStoreProvider boot={() => Promise.resolve({ store })}>
        <Status />
      </AppStoreProvider>,
    );
    await screen.findByText("status:idle");

    await act(async () => {
      await store.getState().refresh({ date: "2026-09-09" });
    });
    expect(screen.getByText("status:idle")).toBeDefined();
    expect(store.getState().lastSyncAt).not.toBeNull();
  });

  it("disposes the resume listener on unmount", async () => {
    const store = makeStore();
    const dispose = vi.fn();
    const { unmount } = render(
      <AppStoreProvider boot={() => Promise.resolve({ store, dispose })}>
        <Status />
      </AppStoreProvider>,
    );
    await screen.findByText("status:idle");

    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("throws a useful error when the hook is used outside the provider", () => {
    expect(() => render(<Status />)).toThrow(/inside <AppStoreProvider>/);
  });
});

describe("AppStoreProvider under StrictMode", () => {
  it("still installs the store when the boot effect is double-invoked", async () => {
    // Regression: a "boot only once" ref guard made the second (StrictMode) effect run bail
    // out while the first run's cleanup had already flagged its own resolution cancelled —
    // so `setStore` never fired and the app sat on the splash forever, silently.
    const store = makeStore();
    render(
      <StrictMode>
        <AppStoreProvider boot={() => Promise.resolve({ store })} fallback={<span>loading</span>}>
          <Status />
        </AppStoreProvider>
      </StrictMode>,
    );
    expect(await screen.findByText("status:idle")).toBeDefined();
  });

  it("registers and disposes the resume listener in lockstep with the mount", async () => {
    const store = makeStore();
    let live = 0;
    const boot = () => {
      live += 1;
      return Promise.resolve({
        store,
        dispose: () => {
          live -= 1;
        },
      });
    };

    const { unmount } = render(
      <StrictMode>
        <AppStoreProvider boot={boot}>
          <Status />
        </AppStoreProvider>
      </StrictMode>,
    );
    await screen.findByText("status:idle");

    unmount();
    // Whatever StrictMode did in between, nothing may be left listening.
    expect(live).toBe(0);
  });
});

describe("AppStoreProvider when boot fails", () => {
  it("surfaces the error instead of showing the splash forever", async () => {
    const boot = () => Promise.reject(new Error("IndexedDB is unavailable"));
    render(
      <AppStoreProvider
        boot={boot}
        fallback={<span>loading</span>}
        errorFallback={(err) => <span>failed:{err.message}</span>}
      >
        <Status />
      </AppStoreProvider>,
    );
    expect(await screen.findByText("failed:IndexedDB is unavailable")).toBeDefined();
  });

  it("falls back to the plain fallback when no error view is given", async () => {
    const boot = () => Promise.reject(new Error("nope"));
    render(
      <AppStoreProvider boot={boot} fallback={<span>loading</span>}>
        <Status />
      </AppStoreProvider>,
    );
    expect(await screen.findByText("loading")).toBeDefined();
  });
});
