/**
 * Resume handling. The throttle matters: Android fires appStateChange on every task-switch,
 * and CLAUDE.md forbids hammering the school's server.
 */
import { describe, expect, it, vi } from "vitest";
import type { NetworkPort } from "../../lib/network/index.ts";

type Listener = (state: { isActive: boolean }) => void;

const addListener = vi.hoisted(() => vi.fn());
vi.mock("@capacitor/app", () => ({ App: { addListener } }));

const { watchAppResume, watchConnectivity } = await import("../lifecycle.ts");

const setup = () => {
  const remove = vi.fn();
  let listener: Listener = () => undefined;
  addListener.mockImplementation((_event: string, fn: Listener) => {
    listener = fn;
    return Promise.resolve({ remove });
  });
  return {
    remove,
    fire: (isActive: boolean) => {
      listener({ isActive });
    },
  };
};

describe("watchAppResume", () => {
  it("refreshes when the app becomes active", () => {
    const { fire } = setup();
    const refresh = vi.fn();
    watchAppResume({ refresh, now: () => 0 });

    fire(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores going to the background", () => {
    const { fire } = setup();
    const refresh = vi.fn();
    watchAppResume({ refresh, now: () => 0 });

    fire(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("throttles rapid task-switching", () => {
    const { fire } = setup();
    const refresh = vi.fn();
    let clock = 1_000;
    watchAppResume({ refresh, now: () => clock, throttleMs: 60_000 });

    fire(true);
    clock += 5_000;
    fire(true);
    clock += 5_000;
    fire(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes again once the throttle window passes", () => {
    const { fire } = setup();
    const refresh = vi.fn();
    let clock = 1_000;
    watchAppResume({ refresh, now: () => clock, throttleMs: 60_000 });

    fire(true);
    clock += 61_000;
    fire(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops refreshing after disposal", async () => {
    const { fire, remove } = setup();
    const refresh = vi.fn();
    const dispose = watchAppResume({ refresh, now: () => 0 });

    dispose();
    await Promise.resolve();
    fire(true);

    expect(refresh).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});

/** A fake `NetworkPort` — `watchConnectivity` only ever talks to the injected port. */
const fakeNetwork = (initiallyOnline: boolean) => {
  let listener: ((online: boolean) => void) | null = null;
  const dispose = vi.fn();
  const port: NetworkPort = {
    isOnline: () => Promise.resolve(initiallyOnline),
    onChange: (fn) => {
      listener = fn;
      return dispose;
    },
  };
  return {
    port,
    dispose,
    fire: (online: boolean) => listener?.(online),
  };
};

describe("watchConnectivity", () => {
  it("reports the initial status once, asynchronously", async () => {
    const { port } = fakeNetwork(false);
    const onChange = vi.fn();
    watchConnectivity({ network: port, onChange });

    expect(onChange).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("relays every subsequent change", async () => {
    const { port, fire } = fakeNetwork(true);
    const onChange = vi.fn();
    watchConnectivity({ network: port, onChange });
    await Promise.resolve();
    onChange.mockClear();

    fire(false);
    fire(true);

    expect(onChange.mock.calls).toEqual([[false], [true]]);
  });

  it("disposes through the port's own disposer", () => {
    const { port, dispose } = fakeNetwork(true);
    const teardown = watchConnectivity({ network: port, onChange: vi.fn() });

    teardown();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
