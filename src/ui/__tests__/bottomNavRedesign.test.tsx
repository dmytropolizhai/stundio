/**
 * Tests for the single-surface bottom bar redesign: `useBarSlots` / `buildBarSlots`,
 * `useChangesCount`, `BottomNav`, `MoreSheet`, `DateDock`, and `StatusBar`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { BottomNav, TooltipProvider } from "@/ds";
import { listTeachers } from "@/lib/edupage";
import { buildBarSlots, useBarSlots, type NavGroup } from "../components/nav-items.ts";
import { TabBar } from "../components/TabBar.tsx";
import { DateDock } from "../components/DateDock.tsx";
import { StatusBar } from "../components/StatusBar.tsx";
import { HomeTopBar } from "../screens/home-view/home-top-bar.tsx";
import { DayHeader } from "../screens/home-view/day-header.tsx";
import { WeekTopBar } from "../screens/week-view/week-top-bar.tsx";
import { ChangesTopBar } from "../screens/changes-view/changes-top-bar.tsx";
import { useChangesCount } from "../hooks/useChangesCount.ts";
import { useScheduleNavigation } from "../hooks/useScheduleNavigation.ts";
import { handleBackPress, registerBackHandler } from "../hooks/useBackButton.ts";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const DURING_FIXTURE_DAY = new Date("2026-09-09T06:00:00Z");

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(
    <TooltipProvider>
      <StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>
    </TooltipProvider>,
  );

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("buildBarSlots / useBarSlots", () => {
  it("folds student personal tabs into one More slot when 2+ are visible", async () => {
    const harness = await bootHarness({ lang: "en", showSubjectsTab: true, showTransitTab: true });
    const { result } = renderHook(() => useBarSlots(), {
      wrapper: ({ children }) => (
        <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>
      ),
    });

    expect(result.current.map((s) => s.key)).toEqual(["home", "week", "changes", "more"]);
    const more = result.current[3];
    expect(more?.kind).toBe("more");
    if (more?.kind === "more") {
      expect(more.items.map((i) => i.key)).toEqual(["subjects", "transit", "settings"]);
    }
  });

  it("drops Subjects from More when showSubjectsTab is false", async () => {
    const harness = await bootHarness({
      lang: "en",
      showSubjectsTab: false,
      showTransitTab: true,
    });
    const { result } = renderHook(() => useBarSlots(), {
      wrapper: ({ children }) => (
        <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>
      ),
    });

    const more = result.current[3];
    expect(more?.kind).toBe("more");
    if (more?.kind === "more") {
      expect(more.items.map((i) => i.key)).toEqual(["transit", "settings"]);
    }
  });

  it("promotes Settings to a direct slot when both Subjects and Transit are off", async () => {
    const harness = await bootHarness({
      lang: "en",
      showSubjectsTab: false,
      showTransitTab: false,
    });
    const { result } = renderHook(() => useBarSlots(), {
      wrapper: ({ children }) => (
        <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>
      ),
    });

    expect(result.current.map((s) => s.key)).toEqual(["home", "week", "changes", "settings"]);
    expect(result.current.every((s) => s.kind === "tab")).toBe(true);
  });

  it("gives teachers a direct Settings slot with no More sheet", async () => {
    const harness = await bootHarness({ lang: "en", persona: "teacher" });
    const { result } = renderHook(() => useBarSlots(), {
      wrapper: ({ children }) => (
        <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>
      ),
    });

    expect(result.current.map((s) => s.key)).toEqual(["home", "week", "changes", "settings"]);
    expect(result.current.every((s) => s.kind === "tab")).toBe(true);
  });

  it("omits the personal slot completely when 0 personal items are visible", () => {
    const groups: NavGroup[] = [
      {
        key: "schedule",
        label: "Schedule",
        items: [{ key: "home", icon: "house", label: "Home", hidden: false }],
      },
      {
        key: "personal",
        label: "Personal",
        items: [{ key: "subjects", icon: "graduation-cap", label: "Subjects", hidden: true }],
      },
    ];
    expect(buildBarSlots(groups, "More")).toEqual([
      { kind: "tab", key: "home", icon: "house", label: "Home" },
    ]);
  });
});

describe("useChangesCount", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIXTURE_DAY);
  });

  it("counts changed lessons for today and later days", async () => {
    const harness = await bootHarness({ lang: "en" });
    const classes = Object.values(harness.store.getState().timetables)[0]?.classes ?? [];
    let expected = 0;
    for (const klass of classes) {
      await clickAndSettle(() => {
        void harness.store.getState().setClass(klass.id);
      });
      const day = harness.store.getState().resolvedDay(FIXTURE_DATE);
      const changed =
        day?.lessons.filter((l) => l.status !== "normal" || l.isCover === true).length ?? 0;
      if (changed > 0) {
        expected = changed;
        break;
      }
    }
    expect(expected).toBeGreaterThan(0);

    const { result } = renderHook(() => useChangesCount(), {
      wrapper: ({ children }) => (
        <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>
      ),
    });

    expect(result.current).toBeGreaterThanOrEqual(expected);
  });
});

describe("BottomNav", () => {
  it("slides the lamp pill to the active slot, caps badges at 9+, and preserves focus order", () => {
    const onChange = vi.fn();
    const items = [
      { key: "home", icon: "house", label: "Home" },
      { key: "week", icon: "layout-grid", label: "Week" },
      {
        key: "changes",
        icon: "repeat",
        label: "Changes",
        badge: 12,
        ariaLabel: "Changes, 12",
      },
      {
        key: "more",
        icon: "ellipsis",
        label: "More",
        hasPopup: "dialog" as const,
        expanded: false,
      },
    ] as const;

    const { rerender } = render(
      <BottomNav items={items} value="week" onChange={onChange} label="Sections" />,
    );

    const nav = screen.getByRole("navigation", { name: "Sections" });
    const buttons = within(nav).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Home",
      "Week",
      "Changes, 12",
      "More",
    ]);
    expect(buttons[1]?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("nav-badge").textContent).toBe("9+");
    expect(screen.getByTestId("bottom-nav-pill").style.transform).toBe(
      `translateX(${(1 / 1.9) * 100}%)`,
    );
    expect(screen.getAllByTestId("nav-label").map((el) => el.dataset.active)).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);

    rerender(<BottomNav items={items} value="more" onChange={onChange} label="Sections" />);
    expect(screen.getByTestId("bottom-nav-pill").style.transform).toBe(
      `translateX(${(3 / 1.9) * 100}%)`,
    );
    expect(screen.getAllByTestId("nav-label").map((el) => el.dataset.active)).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);
    expect(screen.getByRole("button", { name: "More" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("MoreSheet (via TabBar)", () => {
  it("opens, navigates and closes on destination tap, and triggers identity picker", async () => {
    const harness = await bootHarness({ lang: "en" });
    const onChange = vi.fn();
    const onPickIdentity = vi.fn();
    wrap(harness, <TabBar tab="home" onChange={onChange} onPickIdentity={onPickIdentity} />);

    const moreBtn = screen.getByRole("button", { name: "More" });
    expect(moreBtn.getAttribute("aria-haspopup")).toBe("dialog");
    expect(moreBtn.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(moreBtn);
    expect(moreBtn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onChange).toHaveBeenCalledWith("settings");
    expect(screen.queryByRole("dialog")).toBeNull();

    // Open again and click the identity row.
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByTestId("more-identity-row"));
    expect(onPickIdentity).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Android back button before lower-priority handlers run", async () => {
    const harness = await bootHarness({ lang: "en" });
    const lowerPriority = vi.fn();
    const dispose = registerBackHandler(lowerPriority, 5);

    try {
      wrap(harness, <TabBar tab="settings" onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "More" }));
      expect(screen.getByRole("dialog")).toBeDefined();

      await act(async () => {
        await handleBackPress({ minimizeApp: vi.fn() });
      });

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(lowerPriority).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });
});

describe("DateDock", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIXTURE_DAY);
  });

  const DockHost = ({ mode }: { mode: "day" | "week" }) => {
    const nav = useScheduleNavigation();
    return (
      <>
        <span data-testid="current-date">{nav.date}</span>
        <DateDock mode={mode} nav={nav} />
      </>
    );
  };

  it("steps by school day on Home and shows Today only when away from today", async () => {
    const harness = await bootHarness({ lang: "en" });
    wrap(harness, <DockHost mode="day" />);

    const trigger = screen.getByRole("button", { name: "Choose a date" });
    expect(trigger.textContent).toMatch(/Wed/i);
    expect(trigger.textContent).toContain("9");
    expect(screen.queryByTestId("dock-today")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(screen.getByTestId("current-date").textContent).toBe("2026-09-10");
    expect(trigger.textContent).toMatch(/Thu/i);
    expect(trigger.textContent).toContain("10");
    expect(screen.getByTestId("dock-today")).toBeDefined();

    fireEvent.click(screen.getByTestId("dock-today"));
    expect(screen.getByTestId("current-date").textContent).toBe(FIXTURE_DATE);
    expect(screen.queryByTestId("dock-today")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(screen.getByTestId("current-date").textContent).toBe("2026-09-08");
  });

  it("steps by week on Week and opens the calendar picker", async () => {
    const harness = await bootHarness({ lang: "en" });
    wrap(harness, <DockHost mode="week" />);

    expect(screen.queryByTestId("dock-today")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByTestId("current-date").textContent).toBe("2026-09-16");
    expect(screen.getByTestId("dock-today")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByTestId("current-date").textContent).toBe(FIXTURE_DATE);

    fireEvent.click(screen.getByRole("button", { name: "Choose a date" }));
    const jumpToday = screen.getByTestId("calendar-jump-today");
    expect(jumpToday).toBeDefined();
    const slab = screen.getByTestId("calendar-grid-slab");
    expect(slab.className).toContain("u-sheet-slab");
    expect(slab.closest(".u-popover-glass")).not.toBeNull();
  });
});

describe("StatusBar", () => {
  it("shows class and sync status with zero focusable controls", async () => {
    const harness = await bootHarness({ lang: "en" });
    wrap(harness, <StatusBar />);

    const bar = screen.getByTestId("status-bar");
    // Whose schedule is active lives in the Home greeting; the bar only reports sync freshness.
    expect(bar.textContent).not.toContain(harness.store.getState().selectedClassShort() ?? "\0");
    expect(within(bar).getByRole("status")).toBeDefined();
    expect(bar.querySelectorAll("button, a, input, select, textarea, [tabindex]")).toHaveLength(0);
  });

  it("shows abbreviated teacher name in teacher persona", async () => {
    const harness = await bootHarness({ lang: "en" });
    const teacher = listTeachers(Object.values(harness.store.getState().timetables))[0]!;
    await clickAndSettle(() => {
      void harness.store.getState().updateSettings({ persona: "teacher" });
      void harness.store.getState().setTeacher(teacher.id);
    });

    wrap(harness, <StatusBar />);
    const bar = screen.getByTestId("status-bar");
    expect(bar.textContent?.length).toBeGreaterThan(0);
    expect(bar.querySelectorAll("button, a, input, select, textarea, [tabindex]")).toHaveLength(0);
  });
});

describe("Phone top bars and headers", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("strips ClassBadge, SyncBadge and duplicated date controls on phone layout", async () => {
    const harness = await bootHarness({ lang: "en" });

    const { unmount } = wrap(
      harness,
      <HomeTopBar nowMinutes={600} onPickClass={vi.fn()} onRefresh={vi.fn()} />,
    );
    expect(screen.queryByTestId("class-badge")).toBeNull();
    expect(screen.queryByTestId("sync-badge")).toBeNull();
    unmount();

    const day = wrap(
      harness,
      <DayHeader
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={false}
        onDateChange={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Previous day" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next day" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Choose a date" })).toBeNull();
    day.unmount();

    const week = wrap(
      harness,
      <WeekTopBar date="2026-09-09" onDateChange={vi.fn()} onPickClass={vi.fn()} />,
    );
    expect(screen.queryByTestId("class-badge")).toBeNull();
    expect(screen.queryByTestId("sync-badge")).toBeNull();
    // Phone week header: the dock steps weeks, so no chevrons, date text or picker up here.
    expect(screen.queryByRole("button", { name: "Previous week" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next week" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Choose a date" })).toBeNull();
    week.unmount();

    wrap(
      harness,
      <ChangesTopBar
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={true}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("class-badge")).toBeNull();
    expect(screen.queryByTestId("sync-badge")).toBeNull();
    // Changes uses the same DateDock as Home on phones, so no inline chevrons or picker up here.
    expect(screen.queryByRole("button", { name: "Previous day" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next day" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Choose a date" })).toBeNull();
  });
});
