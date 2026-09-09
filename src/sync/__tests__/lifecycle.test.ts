/**
 * Resume handling. The throttle matters: Android fires appStateChange on every task-switch,
 * and CLAUDE.md forbids hammering the school's server.
 */
import { describe, expect, it, vi } from "vitest";

type Listener = (state: { isActive: boolean }) => void;

const addListener = vi.hoisted(() => vi.fn());
vi.mock("@capacitor/app", () => ({ App: { addListener } }));

const { watchAppResume } = await import("../lifecycle.ts");

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
