/**
 * The splash's contract is timing, not pixels: it must rise off empty on its own, park below
 * full while boot is still running, and only then top out and take itself off screen. A splash
 * that never leaves is the worst failure mode here, so that is the case with teeth.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SplashScreen } from "../screens/SplashScreen.tsx";

/** happy-dom does not drive rAF off a real vsync; run the callbacks by hand. */
const flushFrame = async () => {
  await act(async () => {
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  });
};

const level = () => Number(screen.getByTestId("wave-mark").dataset["level"]);

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rises off empty once mounted", async () => {
    render(<SplashScreen ready={false} />);
    expect(level()).toBe(0);

    await flushFrame();
    expect(level()).toBeGreaterThan(0);
  });

  it("holds below full for as long as boot takes", async () => {
    render(<SplashScreen ready={false} />);
    await flushFrame();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(level()).toBeLessThan(100);
    expect(screen.getByTestId("splash")).toBeTruthy();
  });

  it("lets the rise finish even when boot is instant", async () => {
    render(<SplashScreen ready={true} />);
    await flushFrame();

    // Still rising, still on screen: an instant boot must not turn the fill into a flash.
    expect(level()).toBeLessThan(100);
    expect(screen.getByTestId("splash")).toBeTruthy();
  });

  it("tops out and then removes itself once ready", async () => {
    const { rerender } = render(<SplashScreen ready={false} />);
    await flushFrame();

    rerender(<SplashScreen ready={true} />);
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(level()).toBeGreaterThanOrEqual(100);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(screen.queryByTestId("splash")).toBeNull();
  });
});
