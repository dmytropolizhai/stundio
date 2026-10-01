/**
 * The app shell's half of "a splash that never leaves": when boot rejects — the cache cannot be
 * opened, or a chunk it needs failed to load offline — the splash must still clear and uncover
 * a way out, not ripple forever over an empty provider. `bootApp` is swapped for a rejection;
 * everything else is the real `App`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../../App.tsx";

vi.mock("@/store/boot.ts", () => ({
  bootApp: () => Promise.reject(new Error("Failed to fetch dynamically imported module")),
}));

describe("App boot failure", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("takes the splash down and offers a reload instead of loading forever", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    render(<App />);

    expect(screen.getByTestId("splash")).toBeTruthy();
    // Rise, top out, fade — each step is scheduled by the effect the previous one triggers.
    for (let step = 0; step < 5; step++) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
        await Promise.resolve();
      });
    }

    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.getByText("Kaut kas nogāja greizi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
