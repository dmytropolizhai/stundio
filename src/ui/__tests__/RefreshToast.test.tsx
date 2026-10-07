/**
 * The "updated" confirmation: only a clean, user-initiated refresh earns one, and it goes away
 * on its own.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { StoreContext } from "@/store";
import { RefreshToast, TOAST_MS } from "../components/RefreshToast.tsx";
import { bootHarness, FIXTURE_DATE } from "./harness.tsx";

afterEach(() => {
  vi.useRealTimers();
});

const setup = async () => {
  const harness = await bootHarness();
  render(
    <StoreContext.Provider value={harness.store}>
      <RefreshToast />
    </StoreContext.Provider>,
  );
  return harness;
};

describe("RefreshToast", () => {
  it("is absent until a manual refresh lands, then shows and hides itself", async () => {
    const { store } = await setup();
    expect(screen.queryByTestId("refresh-toast")).toBeNull();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => {
      await store.getState().refresh({ date: FIXTURE_DATE, force: true });
    });
    expect(screen.getByTestId("refresh-toast")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_MS + 500);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("refresh-toast")).toBeNull();
    });
  });

  it("stays silent for a routine refresh", async () => {
    const { store } = await setup();
    await act(async () => {
      await store.getState().refresh({ date: FIXTURE_DATE });
    });
    expect(screen.queryByTestId("refresh-toast")).toBeNull();
  });

  it("stays silent when the manual refresh fails", async () => {
    const { store, server } = await setup();
    server.offline = true;
    await act(async () => {
      await store.getState().refresh({ date: FIXTURE_DATE, force: true });
    });
    expect(store.getState().syncStatus).not.toBe("idle");
    expect(screen.queryByTestId("refresh-toast")).toBeNull();
  });
});
