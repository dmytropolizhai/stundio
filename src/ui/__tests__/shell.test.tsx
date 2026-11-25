/**
 * Chrome that has no screen of its own: the tab bar, and the hook that turns the theme
 * setting into a class on <html>.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { TabBar } from "../components/TabBar.tsx";
import { useCustomization, useTheme } from "@/ui/theme";
import { bootHarness, type Harness } from "./harness.tsx";

// Capacitor itself is mocked (mirrors lib/share/__tests__/native.test.ts) — what these tests
// check is that useTheme repaints the status/navigation bar icon colour on the one platform
// that has the plugin, in step with the class it puts on <html>.
const capacitorState = vi.hoisted(() => ({ platform: "web", setAppearance: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => capacitorState.platform },
  registerPlugin: () => ({ setAppearance: capacitorState.setAppearance }),
}));

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

const Customized = () => {
  useCustomization();
  return <span>customized</span>;
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove(
    "dark",
    "radius-2xl",
    "elevation-bold",
    "reduce-motion",
    "accent-amber",
    "accent-sky",
    "accent-lilac",
    "accent-pink",
    "accent-mint",
    "accent-lime",
  );
  capacitorState.platform = "web";
  capacitorState.setAppearance.mockReset();
  capacitorState.setAppearance.mockResolvedValue(undefined);
});

describe("TabBar", () => {
  it("shows primary tabs plus More and reports taps", async () => {
    const harness = await bootHarness();
    const onChange = vi.fn();
    wrap(harness, <TabBar tab="home" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Sākums" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Nedēļa" })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Izmaiņas/ })).toBeDefined();
    expect(screen.getByRole("button", { name: "Vairāk" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /^Izmaiņas/ }));
    expect(onChange).toHaveBeenCalledWith("changes");

    fireEvent.click(screen.getByRole("button", { name: "Vairāk" }));
    fireEvent.click(screen.getByRole("button", { name: "Transports" }));
    expect(onChange).toHaveBeenCalledWith("transit");

    fireEvent.click(screen.getByRole("button", { name: "Vairāk" }));
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

  it("renders one navigation landmark with primary schedule tabs and a More slot", async () => {
    const harness = await bootHarness();
    wrap(harness, <TabBar tab="home" onChange={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Sadaļas" });
    const buttons = within(nav).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(within(nav).getByText("Sākums")).toBeDefined();
    expect(within(nav).getByText("Nedēļa")).toBeDefined();
    expect(within(nav).getByText("Izmaiņas")).toBeDefined();
    expect(within(nav).getByText("Vairāk")).toBeDefined();
  });

  it("gives a teacher a direct Settings slot with no More button", async () => {
    const harness = await bootHarness({ persona: "teacher" });
    wrap(harness, <TabBar tab="settings" onChange={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Sadaļas" });
    expect(within(nav).getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Vairāk" })).toBeNull();
    expect(screen.getByRole("button", { name: "Iestatījumi" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("omits Subjects from More while switched off, and restores it when turned back on", async () => {
    const harness = await bootHarness({ showSubjectsTab: false });
    wrap(harness, <TabBar tab="home" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Vairāk" }));
    expect(screen.queryByRole("button", { name: "Priekšmeti" })).toBeNull();
    expect(screen.getByRole("button", { name: "Iestatījumi" })).toBeDefined();

    await act(async () => {
      await harness.store.getState().updateSettings({ showSubjectsTab: true });
    });
    expect(screen.getByRole("button", { name: "Priekšmeti" })).toBeDefined();
  });

  it("marks More active when the current tab lives inside the More sheet", async () => {
    const harness = await bootHarness();
    const { rerender } = wrap(harness, <TabBar tab="week" onChange={vi.fn()} />);

    expect(screen.getByTestId("bottom-nav-pill").style.transform).toBe(
      `translateX(${(1 / 1.9) * 100}%)`,
    );

    rerender(
      <StoreContext.Provider value={harness.store}>
        <TabBar tab="settings" onChange={vi.fn()} />
      </StoreContext.Provider>,
    );
    expect(screen.getByTestId("bottom-nav-pill").style.transform).toBe(
      `translateX(${(3 / 1.9) * 100}%)`,
    );
    expect(screen.getByRole("button", { name: "Vairāk" }).getAttribute("aria-current")).toBe(
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

  it("repaints the status/navigation bar icons through SystemBars on Android", async () => {
    capacitorState.platform = "android";
    const harness = await bootHarness({ theme: "dark" });
    wrap(harness, <Themed />);
    expect(capacitorState.setAppearance).toHaveBeenCalledWith({ style: "dark" });
  });

  it("never reaches for SystemBars outside Android — there is no plugin to call", async () => {
    const harness = await bootHarness({ theme: "dark" });
    wrap(harness, <Themed />);
    expect(capacitorState.setAppearance).not.toHaveBeenCalled();
  });
});

describe("useCustomization", () => {
  it("defaults to none of the classes set", async () => {
    const harness = await bootHarness();
    wrap(harness, <Customized />);
    expect(document.documentElement.classList.contains("radius-2xl")).toBe(false);
    expect(document.documentElement.classList.contains("elevation-bold")).toBe(false);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(false);
  });

  it("toggles each class as the matching setting changes", async () => {
    const harness = await bootHarness({
      cardRadius: "2xl",
      cardElevation: "bold",
      reduceMotion: true,
    });
    wrap(harness, <Customized />);
    expect(document.documentElement.classList.contains("radius-2xl")).toBe(true);
    expect(document.documentElement.classList.contains("elevation-bold")).toBe(true);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);

    await act(async () => {
      await harness.store.getState().updateSettings({ cardRadius: "xl" });
    });
    expect(document.documentElement.classList.contains("radius-2xl")).toBe(false);
  });

  it("leaves every accent class off for the default accent", async () => {
    const harness = await bootHarness();
    wrap(harness, <Customized />);
    for (const tone of ["amber", "sky", "lilac", "pink", "mint", "lime"]) {
      expect(document.documentElement.classList.contains(`accent-${tone}`)).toBe(false);
    }
  });

  it("sets exactly one accent class for a chosen accent, and moves it on change", async () => {
    const harness = await bootHarness({ appAccent: "lilac" });
    wrap(harness, <Customized />);
    expect(document.documentElement.classList.contains("accent-lilac")).toBe(true);
    expect(document.documentElement.classList.contains("accent-sky")).toBe(false);

    await act(async () => {
      await harness.store.getState().updateSettings({ appAccent: "mint" });
    });
    expect(document.documentElement.classList.contains("accent-lilac")).toBe(false);
    expect(document.documentElement.classList.contains("accent-mint")).toBe(true);

    await act(async () => {
      await harness.store.getState().updateSettings({ appAccent: "default" });
    });
    expect(document.documentElement.classList.contains("accent-mint")).toBe(false);
  });
});
