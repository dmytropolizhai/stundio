/**
 * Chrome that has no screen of its own: the tab bar, and the hook that turns the theme
 * setting into a class on <html>.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { TabBar } from "../components/TabBar.tsx";
import { useTheme } from "../theme/index.ts";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

/** A matchMedia stub whose result we control, plus the listeners it was handed. */
const stubMatchMedia = (dark: boolean) => {
  const listeners = new Set<() => void>();
  const media = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  return {
    listeners,
    set: (value: boolean) => {
      media.matches = value;
      for (const fn of listeners) fn();
    },
  };
};

const Themed = () => {
  useTheme();
  return <span>themed</span>;
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
});

describe("TabBar", () => {
  it("shows every tab and reports taps", async () => {
    const harness = await bootHarness();
    const onChange = vi.fn();
    wrap(harness, <TabBar tab="day" onChange={onChange} />);

    /*
     * Every tab is a bare icon — the design system's nav slides an inverse-fill pill beneath the
     * selected one rather than growing a label into view. Each tab's name still reaches assistive
     * tech via `aria-label`, which is what these queries rely on.
     */
    expect(screen.getByRole("button", { name: "Diena" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Nedēļa" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Priekšmeti" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Iestatījumi" }));
    expect(onChange).toHaveBeenCalledWith("settings");
  });

  it("marks the active tab for assistive tech, not just visually", async () => {
    const harness = await bootHarness();
    wrap(harness, <TabBar tab="week" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Nedēļa" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});

describe("useTheme", () => {
  it("follows the system while set to system", async () => {
    const media = stubMatchMedia(true);
    const harness = await bootHarness({ theme: "system" });
    wrap(harness, <Themed />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      media.set(false);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ignores the system once the user has chosen", async () => {
    const media = stubMatchMedia(false);
    const harness = await bootHarness({ theme: "dark" });
    wrap(harness, <Themed />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // An explicit choice must survive the OS flipping underneath it.
    act(() => {
      media.set(true);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(media.listeners.size).toBe(0);
  });

  it("still renders where matchMedia is missing (old WebViews)", async () => {
    vi.stubGlobal("matchMedia", undefined);
    const harness = await bootHarness({ theme: "system" });
    wrap(harness, <Themed />);
    expect(screen.getByText("themed")).toBeDefined();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
