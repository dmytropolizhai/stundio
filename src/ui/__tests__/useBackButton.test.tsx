import { describe, expect, it, vi } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { BottomSheet } from "@/ds";
import {
  dismissTopOverlay,
  handleBackPress,
  registerBackHandler,
  useBackButton,
} from "../hooks/useBackButton.ts";

describe("useBackButton & handleBackPress", () => {
  it("dismissTopOverlay returns false when no overlay intercepts Escape", () => {
    expect(dismissTopOverlay()).toBe(false);
  });

  it("dismisses open BottomSheet on back press", async () => {
    const onClose = vi.fn();
    const minimize = vi.fn();

    render(
      <BottomSheet open onClose={onClose} title="Test Sheet">
        <p>Sheet content</p>
      </BottomSheet>,
    );

    const handled = await handleBackPress({ minimizeApp: minimize });

    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(minimize).not.toHaveBeenCalled();
  });

  it("falls back to minimizeApp when nothing is open or registered", async () => {
    const minimize = vi.fn().mockResolvedValue(undefined);

    const handled = await handleBackPress({ minimizeApp: minimize });

    expect(handled).toBe(true);
    expect(minimize).toHaveBeenCalledTimes(1);
  });

  it("executes registered handlers in priority order", async () => {
    const callOrder: string[] = [];
    const minimize = vi.fn();

    const unreg1 = registerBackHandler(() => {
      callOrder.push("low");
      return false;
    }, 1);

    const unreg2 = registerBackHandler(() => {
      callOrder.push("high");
      return true;
    }, 10);

    const unreg3 = registerBackHandler(() => {
      callOrder.push("mid");
      return false;
    }, 5);

    await handleBackPress({ minimizeApp: minimize });

    expect(callOrder).toEqual(["high"]);
    expect(minimize).not.toHaveBeenCalled();

    unreg1();
    unreg2();
    unreg3();
  });

  it("executes same-priority handlers in LIFO order", async () => {
    const callOrder: string[] = [];
    const minimize = vi.fn();

    const unreg1 = registerBackHandler(() => {
      callOrder.push("first");
      return false;
    }, 5);

    const unreg2 = registerBackHandler(() => {
      callOrder.push("second");
      return false;
    }, 5);

    await handleBackPress({ minimizeApp: minimize });

    expect(callOrder).toEqual(["second", "first"]);
    expect(minimize).toHaveBeenCalledTimes(1);

    unreg1();
    unreg2();
  });

  it("unregisters properly via disposer", async () => {
    const handler = vi.fn().mockReturnValue(true);
    const minimize = vi.fn();

    const unregister = registerBackHandler(handler, 10);
    unregister();

    await handleBackPress({ minimizeApp: minimize });

    expect(handler).not.toHaveBeenCalled();
    expect(minimize).toHaveBeenCalledTimes(1);
  });

  it("manages hook lifecycle and uses latest state without re-registering", async () => {
    const minimize = vi.fn();
    const calls: number[] = [];

    const { rerender, unmount } = renderHook(
      ({ count, enabled }) => {
        useBackButton(
          () => {
            calls.push(count);
            return true;
          },
          { enabled, priority: 5 },
        );
      },
      { initialProps: { count: 1, enabled: true } },
    );

    // Initial render
    await handleBackPress({ minimizeApp: minimize });
    expect(calls).toEqual([1]);

    // Rerender with updated count
    rerender({ count: 2, enabled: true });
    await handleBackPress({ minimizeApp: minimize });
    expect(calls).toEqual([1, 2]);

    // Disable hook
    rerender({ count: 3, enabled: false });
    await handleBackPress({ minimizeApp: minimize });
    // Since hook is disabled, minimize should be called
    expect(minimize).toHaveBeenCalledTimes(1);

    // Unmount
    unmount();
    await handleBackPress({ minimizeApp: minimize });
    expect(minimize).toHaveBeenCalledTimes(2);
  });
});
