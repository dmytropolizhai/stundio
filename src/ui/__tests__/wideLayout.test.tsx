/**
 * Tablet and desktop layouts. The phone layout is the reference: every test here also checks
 * that a phone-sized window (or no `matchMedia` at all) still gets exactly the floating tab bar
 * and no side column.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import App from "../../App.tsx";
import { bootApp } from "@/store/boot.ts";
import { StoreContext } from "@/store";
import { TooltipProvider } from "@/ds";
import { HomeView } from "../screens/home-view";
import { LAYOUT_QUERIES, useLayout, type Layout } from "../hooks/useLayout.ts";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

vi.mock("@/store/boot.ts", () => ({ bootApp: vi.fn() }));

/** 08:50 Riga on the fixture date: inside the first lesson. */
const DURING_FIRST_LESSON = new Date("2026-09-09T05:50:00Z");

/** A window of the given layout's size; every other media query (dark mode, standalone) is off. */
const stubLayout = (initial: Layout) => {
  let layout = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        if (query === LAYOUT_QUERIES.desktop) return layout === "desktop";
        if (query === LAYOUT_QUERIES.tablet) return layout !== "phone";
        return false;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })),
  );
  return {
    resize: (next: Layout) => {
      layout = next;
      for (const fn of listeners) fn();
    },
  };
};

const ENGLISH = {
  lang: "en",
  teacherAnnouncementDismissed: true,
  lastSeenChangelogVersion: __APP_VERSION__,
  iphoneInstallPromptDismissed: true,
} as const;

const renderApp = async (harness: Harness) => {
  vi.mocked(bootApp).mockResolvedValue({ store: harness.store });
  await act(async () => {
    render(<App />);
    await Promise.resolve();
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useLayout", () => {
  it("is the phone layout where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe("phone");
  });

  it("is the phone layout where the MediaQueryList cannot be listened to (old WebViews)", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { result, unmount } = renderHook(() => useLayout());
    expect(result.current).toBe("phone");
    unmount();
  });

  it("follows the window across all three layouts", () => {
    const window = stubLayout("phone");
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe("phone");

    act(() => {
      window.resize("tablet");
    });
    expect(result.current).toBe("tablet");

    act(() => {
      window.resize("desktop");
    });
    expect(result.current).toBe("desktop");
  });

  it("keeps a phone in landscape on the phone layout", () => {
    expect(LAYOUT_QUERIES.tablet).toContain("min-height");
    expect(LAYOUT_QUERIES.desktop).toContain("min-height");
  });
});

describe("app shell", () => {
  it("keeps the floating tab bar, and no rail, on a phone", async () => {
    stubLayout("phone");
    await renderApp(await bootHarness(ENGLISH));

    expect(screen.queryByTestId("side-nav")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Schedule" })).toBeDefined();
  });

  it("puts an icon-only rail on a tablet, named for assistive tech", async () => {
    stubLayout("tablet");
    await renderApp(await bootHarness(ENGLISH));

    const rail = screen.getByTestId("side-nav");
    expect(screen.queryByRole("navigation", { name: "Schedule" })).toBeNull();
    const week = within(rail).getByRole("button", { name: "Week" });
    expect(week.textContent).toBe("");
    expect(within(rail).queryByText("Personal")).toBeNull();
  });

  it("labels the rail and its groups on a desktop, and switches tabs from it", async () => {
    stubLayout("desktop");
    await renderApp(await bootHarness(ENGLISH));

    const rail = screen.getByTestId("side-nav");
    expect(within(rail).getByText("Schedule")).toBeDefined();
    expect(within(rail).getByText("Personal")).toBeDefined();
    expect(within(rail).getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe(
      "page",
    );

    fireEvent.click(within(rail).getByRole("button", { name: "Settings" }));
    expect(
      within(rail).getByRole("button", { name: "Settings" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(within(rail).getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe(
      null,
    );
  });

  it("leaves a tab switched off in Settings out of the rail", async () => {
    stubLayout("desktop");
    const harness = await bootHarness(ENGLISH);
    await renderApp(harness);
    const rail = screen.getByTestId("side-nav");
    expect(within(rail).getByRole("button", { name: "Subjects" })).toBeDefined();

    await clickAndSettle(() => {
      void harness.store.getState().updateSettings({ showSubjectsTab: false });
    });
    expect(within(rail).queryByRole("button", { name: "Subjects" })).toBeNull();
  });

  it("swaps the rail for the tab bar when the window shrinks to phone size", async () => {
    const window = stubLayout("desktop");
    await renderApp(await bootHarness(ENGLISH));
    expect(screen.getByTestId("side-nav")).toBeDefined();

    act(() => {
      window.resize("phone");
    });
    expect(screen.queryByTestId("side-nav")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Schedule" })).toBeDefined();
  });
});

describe("Home side column", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIRST_LESSON);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderHome = (harness: Harness, date = FIXTURE_DATE) => {
    const onDateChange = vi.fn();
    const onOpenChanges = vi.fn();
    render(
      <TooltipProvider>
        <StoreContext.Provider value={harness.store}>
          <HomeView
            date={date}
            onDateChange={onDateChange}
            onPickClass={vi.fn()}
            onOpenChanges={onOpenChanges}
          />
        </StoreContext.Provider>
      </TooltipProvider>,
    );
    return { onDateChange, onOpenChanges };
  };

  /** Selects the first class that has a changed lesson on the fixture date. */
  const pickClassWithChanges = async (harness: Harness): Promise<number> => {
    const classes = Object.values(harness.store.getState().timetables)[0]?.classes ?? [];
    for (const klass of classes) {
      await clickAndSettle(() => {
        void harness.store.getState().setClass(klass.id);
      });
      const day = harness.store.getState().resolvedDay(FIXTURE_DATE);
      const changed = day?.lessons.filter((l) => l.status !== "normal").length ?? 0;
      if (changed > 0) return changed;
    }
    throw new Error("no class in the fixtures has a changed lesson");
  };

  it("is not there on a phone or a tablet", async () => {
    const harness = await bootHarness(ENGLISH);
    const window = stubLayout("phone");
    renderHome(harness);
    expect(screen.queryByTestId("home-side")).toBeNull();

    act(() => {
      window.resize("tablet");
    });
    expect(screen.queryByTestId("home-side")).toBeNull();
  });

  it("sets today's changes and the week's overview beside the day on a desktop", async () => {
    stubLayout("desktop");
    const harness = await bootHarness(ENGLISH);
    const changed = await pickClassWithChanges(harness);
    const { onOpenChanges } = renderHome(harness);

    const side = screen.getByTestId("home-side");
    expect(within(side).getByText("Changes today")).toBeDefined();
    expect(within(side).getAllByRole("button").length).toBeGreaterThanOrEqual(changed);
    expect(within(side).getByText("Overview")).toBeDefined();

    fireEvent.click(within(side).getByRole("button", { name: "All changes" }));
    expect(onOpenChanges).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("stays on today while the day list is paged to another day", async () => {
    stubLayout("desktop");
    const harness = await bootHarness(ENGLISH);
    await pickClassWithChanges(harness);
    renderHome(harness, "2026-09-11");

    expect(within(screen.getByTestId("home-side")).getByText("Changes today")).toBeDefined();
  });

  it("previews the next school day, and opens it on tap", async () => {
    stubLayout("desktop");
    const harness = await bootHarness(ENGLISH);
    const { onDateChange } = renderHome(harness);

    fireEvent.click(within(screen.getByTestId("home-side")).getByTestId("day-tomorrow"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });
});
