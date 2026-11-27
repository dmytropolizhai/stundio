/**
 * The Home critique's P0/P1 fixes, each pinned to the behaviour a student would notice: the
 * lesson on now is never left hidden under the dock, a cancelled lesson says so in words and
 * stays readable, the school tile names what it counts down to, and the small controls keep a
 * 44 px hit area.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { IconButton, TooltipProvider } from "@/ds";
import { HomeView } from "../screens/home-view";
import { bootHarness, FIXTURE_DATE, type Harness } from "./harness.tsx";

/** 08:50 Riga on the fixture date: inside the first lesson. */
const DURING_FIRST_LESSON = new Date("2026-09-09T05:50:00Z");

const renderDay = (harness: Harness, dockedGlance: boolean) =>
  render(
    <TooltipProvider>
      <StoreContext.Provider value={harness.store}>
        <HomeView
          date={FIXTURE_DATE}
          onDateChange={vi.fn()}
          onPickClass={vi.fn()}
          dockedGlance={dockedGlance}
        />
      </StoreContext.Provider>
    </TooltipProvider>,
  );

describe("Home critique fixes", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIRST_LESSON);
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });

  it("brings the lesson on now clear of the dock, once, when the dock covers the list", async () => {
    const harness = await bootHarness();
    renderDay(harness, true);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    const row = scrollIntoView.mock.contexts[0] as HTMLElement;
    // The row on now wins over anything earlier that is still unmarked, such as a cancelled lesson.
    const live = document.querySelector('[data-live="true"]');
    expect(row).toBe(
      live ?? document.querySelector('[role="button"][data-testid^="lesson-"]:not([data-passed])'),
    );
    // The margin is the dock stack's own height, so "nearest" scrolls only when it is covered.
    expect(row.style.scrollMarginBottom).toBe("var(--nav-safe)");

    // The clock ticking on does not drag the list back under the student's finger.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("leaves the scroll alone when nothing docks over the list", async () => {
    const harness = await bootHarness();
    renderDay(harness, false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("says a cancelled lesson is cancelled in words, and keeps its text readable", async () => {
    const harness = await bootHarness();
    renderDay(harness, false);

    const badge = screen.getAllByTestId("status-cancelled")[0];
    expect(badge?.textContent?.trim()).not.toBe("");
    const row = badge?.closest('[role="button"]');
    expect(row).not.toBeNull();
    // Dimming by opacity put cancelled text under 3:1; it is struck through in muted ink instead.
    expect(row?.className).not.toContain("opacity-55");
    const title = within(row as HTMLElement).getByRole("heading", { level: 3 });
    expect(title.className).toContain("line-through");
    expect(title.className).toContain("text-muted");
  });

  it("names what the school countdown runs to, in its label as well as on its face", async () => {
    const harness = await bootHarness();
    renderDay(harness, false);

    const tile = screen.getByTestId("home-brief");
    expect(tile.textContent).toMatch(/līdz beigām$/);
    expect(tile.getAttribute("aria-label")).toMatch(/\d+:\d\d līdz beigām/);
  });

  it("keeps a 44 px hit area behind the 36 px icon button", () => {
    render(<IconButton icon="chevron-left" label="Back" variant="bare" size="sm" />);
    const classes = screen.getByRole("button", { name: "Back" }).className.split(/\s+/);
    expect(classes).toContain("size-9");
    expect(classes).toContain("before:-inset-1");
  });
});
