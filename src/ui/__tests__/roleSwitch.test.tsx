/**
 * Switching role in Settings to one with nothing picked yet must land in that role's own
 * picker — a class, a teacher, a university group — not back on the very first onboarding
 * screen (the language question). Backing out returns to the role the user came from.
 * The real `App`, booted on the fixture-backed harness store.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { Store } from "@/store";
import { bootHarness } from "./harness.tsx";

const harness = vi.hoisted(() => ({ store: null as Store | null }));
vi.mock("@/store/boot.ts", () => ({
  bootApp: () => {
    if (harness.store === null) return Promise.reject(new Error("no store"));
    return Promise.resolve({ store: harness.store });
  },
}));

const { default: App } = await import("../../App.tsx");

const boot = async () => {
  const { store } = await bootHarness();
  harness.store = store;
  render(<App />);
  // The student's own day is up: the app is identified.
  await waitFor(() => {
    expect(screen.getByTestId("class-badge")).toBeDefined();
  });
  return store;
};

afterEach(() => {
  harness.store = null;
});

describe("switching role", () => {
  it("opens the teacher picker, not the language step", async () => {
    const store = await boot();
    await act(async () => {
      await store.getState().setPersona("teacher");
    });
    expect(await screen.findByLabelText("Meklēt skolotāju…")).toBeDefined();
    expect(screen.queryByText("Izvēlies valodu")).toBeNull();
  });

  it("opens the university group picker for the university role", async () => {
    const store = await boot();
    await act(async () => {
      await store.getState().setPersona("university");
    });
    expect(await screen.findByLabelText("Meklēt programmu, kodu vai grupu…")).toBeDefined();
  });

  it("backs out to the role the user came from", async () => {
    const store = await boot();
    await act(async () => {
      await store.getState().setPersona("teacher");
    });
    await screen.findByLabelText("Meklēt skolotāju…");
    await act(async () => {
      screen.getByRole("button", { name: /atpakaļ|back/i }).click();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(store.getState().settings.persona).toBe("student");
    });
    expect(await screen.findByTestId("class-badge")).toBeDefined();
  });
});
