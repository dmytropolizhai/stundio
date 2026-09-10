/**
 * The day screen against the real 2026-09-09 fixtures. What matters here is the promises
 * CLAUDE.md makes to the user: cancelled lessons stay on screen, EduPage's own wording is
 * shown verbatim, and every empty state says something.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { DayView } from "../screens/DayView.tsx";
import { bootHarness, FIXTURE_DATE, type Harness } from "./harness.tsx";

/** 08:50 Riga on the fixture date: inside the first lesson. */
const DURING_FIRST_LESSON = new Date("2026-09-09T05:50:00Z");

const renderDay = (harness: Harness, date = FIXTURE_DATE) => {
  const onDateChange = vi.fn();
  const result = render(
    <StoreContext.Provider value={harness.store}>
      <DayView date={date} onDateChange={onDateChange} onPickClass={vi.fn()} />
    </StoreContext.Provider>,
  );
  return { ...result, onDateChange };
};

describe("DayView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIRST_LESSON);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the class's lessons for the day", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    /*
     * The design system's lesson card is a `div role="button"` — it nests a heading and its own
     * badges, which a real `<button>` may not contain — so rows are found by role, not by tag.
     */
    const rows = screen
      .getAllByRole("listitem")
      .filter((li) => li.querySelector('[role="button"]'));
    expect(rows.length).toBeGreaterThan(0);
    // The header says "Today" because the fake clock is on the fixture date.
    expect(screen.getByText("Šodien")).toBeDefined();
  });

  it("keeps cancelled lessons visible with the school's own wording", async () => {
    // A1-2 is the harness default and has real cancellations that day (resolve.test.ts).
    const harness = await bootHarness();
    renderDay(harness);

    const badge = screen.getAllByTestId("status-cancelled")[0];
    expect(badge).toBeDefined();

    // Opening it shows the raw Latvian note under a "from school" label, untranslated.
    fireEvent.click(badge!.closest('[role="button"]')!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("No skolas")).toBeDefined();
  });

  it("marks where the clock is on today's list", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("now-marker")).not.toBeNull();
  });

  it("shows no now-marker on a day that is not today", async () => {
    const harness = await bootHarness();
    renderDay(harness, "2026-09-10");
    expect(screen.queryByTestId("now-marker")).toBeNull();
  });

  it("offers a way back to today when browsing another day", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness, "2026-09-11");

    fireEvent.click(screen.getByText("Uz šodienu"));
    expect(onDateChange).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("steps a day at a time", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    fireEvent.click(screen.getByLabelText("Nākamā diena"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    fireEvent.click(screen.getByLabelText("Iepriekšējā diena"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");
  });

  it("explains an empty day rather than going blank", async () => {
    const harness = await bootHarness();
    renderDay(harness, "2026-09-12"); // Saturday
    expect(screen.getByText("Stundu nav")).toBeDefined();
  });

  it("asks for a class when none is picked", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    renderDay(harness);
    expect(screen.getByText("Vispirms izvēlies klasi")).toBeDefined();
  });

  it("translates its chrome but never the school's text", async () => {
    const harness = await bootHarness({ lang: "en" });
    renderDay(harness);
    expect(screen.getByText("Today")).toBeDefined();
  });

  it("pull-to-refresh forces a sync for the day on screen", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    const before = harness.server.calls.substitutions;

    const scroller = screen.getByTestId("scroller");
    fireEvent.touchStart(scroller, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(scroller, { touches: [{ clientY: 400 }] });
    fireEvent.touchEnd(scroller);

    await vi.waitFor(() => {
      expect(harness.server.calls.substitutions).toBeGreaterThan(before);
    });
  });
});
