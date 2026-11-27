import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StoreContext } from "@/store";
import { TooltipProvider } from "@/ds";
import { LAYOUT_QUERIES, type Layout } from "../hooks/useLayout.ts";
import { WeekView } from "../screens/week-view";
import { bootHarness, FIXTURE_DATE, type Harness } from "./harness.tsx";

const stubLayout = (layout: Layout) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches:
        query === LAYOUT_QUERIES.desktop
          ? layout === "desktop"
          : query === LAYOUT_QUERIES.tablet
            ? layout !== "phone"
            : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(
    <TooltipProvider>
      <StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>
    </TooltipProvider>,
  );

describe("WeekView interactions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggles between Detailed 2D pan and 5-day Full-Week overview on phones", async () => {
    stubLayout("phone");
    const harness = await bootHarness();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    const calendar = screen.getByTestId("week-calendar");
    const toggle = screen.getByTestId("week-density-toggle");

    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);
    expect(calendar.getAttribute("data-density")).toBe("overview");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);
    expect(calendar.getAttribute("data-density")).toBe("detailed");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("omits the zoom toggle on desktop where all 5 columns fit in detailed mode", async () => {
    stubLayout("desktop");
    const harness = await bootHarness();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    expect(screen.getByTestId("week-calendar").getAttribute("data-density")).toBe("detailed");
    expect(screen.queryByTestId("week-density-toggle")).toBeNull();
  });

  it("shows each day's lesson count in its header and opens that day on tap", async () => {
    const harness = await bootHarness();
    const onOpenDay = vi.fn();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={onOpenDay}
        onPickClass={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("week-overview")).toBeNull();
    const counts = screen.getAllByTestId("week-day-count");
    expect(counts).toHaveLength(5);

    const header = counts[0]!.closest("button")!;
    expect(header.getAttribute("aria-label")).toMatch(/\d/);
    fireEvent.click(header);
    expect(onOpenDay).toHaveBeenCalledWith("2026-09-07");
  });

  it("steps a whole week via the switcher chevrons on wide layouts only", async () => {
    stubLayout("tablet");
    const harness = await bootHarness();
    const onDateChange = vi.fn();
    const view = wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={onDateChange}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Nākamā nedēļa"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-16");
    fireEvent.click(screen.getByLabelText("Iepriekšējā nedēļa"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-02");
    view.unmount();

    stubLayout("phone");
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={onDateChange}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Nākamā nedēļa")).toBeNull();
  });

  it("zooms the canvas continuously with a two-finger pinch on phones", async () => {
    stubLayout("phone");
    const harness = await bootHarness();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    const scroller = screen.getByTestId("week-calendar-scroll");
    const grid = scroller.firstElementChild as HTMLElement;
    const widthBefore = parseInt(grid.style.minWidth, 10);

    const touch = (x: number) => ({ clientX: x, clientY: 100, identifier: x });
    const fire = (type: string, xs: number[]) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, "touches", { value: xs.map(touch) });
      act(() => {
        scroller.dispatchEvent(ev);
      });
    };

    fire("touchstart", [100, 200]);
    fire("touchmove", [60, 240]);
    await waitFor(() => {
      expect(parseInt(grid.style.minWidth, 10)).toBeGreaterThan(widthBefore);
    });
    fire("touchend", []);

    // Pinching all the way in past the floor snaps to the fit-all layout.
    fire("touchstart", [60, 240]);
    fire("touchmove", [149, 151]);
    await waitFor(() => {
      expect(screen.getByTestId("week-calendar").getAttribute("data-density")).toBe("overview");
    });
  });

  it("syncs scroll-depth flags without re-rendering when the 2D canvas scrolls", async () => {
    const harness = await bootHarness();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    const calendar = screen.getByTestId("week-calendar");
    const scroller = screen.getByTestId("week-calendar-scroll");

    expect(calendar.getAttribute("data-scrolled-x")).toBeNull();
    expect(calendar.getAttribute("data-scrolled-y")).toBeNull();

    scroller.scrollLeft = 40;
    scroller.scrollTop = 60;
    fireEvent.scroll(scroller);

    expect(calendar.getAttribute("data-scrolled-x")).toBe("true");
    expect(calendar.getAttribute("data-scrolled-y")).toBe("true");

    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    fireEvent.scroll(scroller);

    expect(calendar.getAttribute("data-scrolled-x")).toBeNull();
    expect(calendar.getAttribute("data-scrolled-y")).toBeNull();
  });

  it("renders a recenter-on-today button when viewing the current week", async () => {
    vi.useFakeTimers();
    try {
      // Wednesday 2026-09-09 at 09:00 Europe/Riga (UTC+3 → 06:00Z).
      vi.setSystemTime(new Date("2026-09-09T06:00:00Z"));
      const harness = await bootHarness();
      wrap(
        harness,
        <WeekView
          date={FIXTURE_DATE}
          onDateChange={vi.fn()}
          onOpenDay={vi.fn()}
          onPickClass={vi.fn()}
        />,
      );

      const recenter = screen.getByTestId("week-recenter");
      expect(recenter).toBeTruthy();
      expect(screen.getByTestId("week-now-line")).toBeTruthy();
      expect(screen.getByTestId("week-now-pill")).toBeTruthy();

      fireEvent.click(recenter);
    } finally {
      vi.useRealTimers();
    }
  });
});
