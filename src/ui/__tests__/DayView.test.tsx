/**
 * The day screen against the real 2026-09-09 fixtures. What matters here is the promises
 * CLAUDE.md makes to the user: cancelled lessons stay on screen, EduPage's own wording is
 * shown verbatim, and every empty state says something.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { DayView } from "../screens/DayView.tsx";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

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

  it("names yesterday and tomorrow in the header, and dates anything further out", async () => {
    const harness = await bootHarness();

    const { unmount } = renderDay(harness, "2026-09-10");
    expect(screen.getByText("Rīt")).toBeDefined();
    unmount();

    const back = renderDay(harness, "2026-09-08");
    expect(screen.getByText("Vakar")).toBeDefined();
    back.unmount();

    renderDay(harness, "2026-09-11");
    expect(screen.queryByText("Rīt")).toBeNull();
    expect(screen.queryByText("Vakar")).toBeNull();
  });

  it("says nothing about the building on an ordinary main-building day", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("day-building")).toBeNull();
  });

  it("calls the building out, once up top and again on each card, when it is not the main one", async () => {
    // The fixture server answers every tt_num with the same week, so pinning TIC gives a day
    // whose lessons are real but published under the annex — the case automatic mode merges.
    const harness = await bootHarness({ building: "TIC" });
    renderDay(harness);

    expect(screen.getByTestId("day-building").textContent).toContain("Cita ēka: TIC");
    expect(screen.getAllByText("TIC").length).toBeGreaterThan(0);
  });

  const RAIL_CLASSES = ["bg-amber", "bg-sky", "bg-lilac", "bg-pink", "bg-mint", "bg-lime"];
  const railTonesUsed = (container: HTMLElement): Set<string> =>
    new Set(
      [...container.querySelectorAll("span")]
        .flatMap((span) => span.className.split(" "))
        .filter((cls) => RAIL_CLASSES.includes(cls)),
    );

  it("colours the subject rail with more than one tone by default", async () => {
    const harness = await bootHarness();
    const { container } = renderDay(harness);
    expect(railTonesUsed(container).size).toBeGreaterThan(1);
  });

  it("falls the subject rail back to one neutral tone with colour-coding off", async () => {
    const harness = await bootHarness({ subjectColorCodingEnabled: false });
    const { container } = renderDay(harness);
    expect(railTonesUsed(container)).toEqual(new Set(["bg-sky"]));
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

  it("opens a calendar anchored under the header and jumps to the picked date", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    fireEvent.click(screen.getByRole("button", { name: "Izvēlēties datumu" }));
    const dayButton = await screen.findByRole("button", { name: "10" });
    fireEvent.click(dayButton);

    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("closes the calendar's own today shortcut back onto the fixture date", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness, "2026-09-11");

    fireEvent.click(screen.getByRole("button", { name: "Izvēlēties datumu" }));
    fireEvent.click(await screen.findByTestId("calendar-jump-today"));

    expect(onDateChange).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("offers a way back to today when browsing another day", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness, "2026-09-11");

    fireEvent.click(screen.getByText("Uz šodienu"));
    expect(onDateChange).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("pages to the next day on a left swipe, and back on a right swipe", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    fireEvent.touchStart(pager, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");
  });

  it("ignores a drag that stays under the swipe threshold", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 280, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("ignores a mostly-vertical drag, so scrolling the list never pages the day", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 260, clientY: 600 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("steps a day at a time with the arrow keys, for anyone who can't swipe", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.keyDown(pager, { key: "ArrowRight" });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    fireEvent.keyDown(pager, { key: "ArrowLeft" });
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

  it("shows the offline banner once syncStatus says offline, and hides it once synced again", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("offline-banner")).toBeNull();

    act(() => {
      harness.store.getState().setConnectivity(false);
    });
    expect(screen.getByTestId("offline-banner")).toBeDefined();
    expect(screen.getByText("Nav interneta pieslēguma — rādām saglabāto sarakstu.")).toBeDefined();

    await act(async () => {
      harness.store.getState().setConnectivity(true);
      await vi.waitFor(() => {
        expect(harness.store.getState().syncStatus).toBe("idle");
      });
    });
    expect(screen.queryByTestId("offline-banner")).toBeNull();
  });

  it("hides announcement card when no announcements for class and allows toggling all", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    // Default class A1-2 has no announcements, so the card heading is not shown by default
    expect(screen.queryByText(/Paziņojumi · no skolas/)).toBeNull();

    // A subtle button to show all school announcements is available
    const toggleButton = screen.getByRole("button", { name: /Visi skolas paziņojumi/ });
    expect(toggleButton).toBeDefined();

    // Clicking it reveals the school announcements
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Paziņojumi · No skolas/i)).toBeDefined();
    expect(screen.getByText(/SC2 grupai/)).toBeDefined();

    // And the button switches to "Tikai manai grupai"
    const onlyGroupButton = screen.getByRole("button", { name: "Tikai manai grupai" });
    expect(onlyGroupButton).toBeDefined();

    // Clicking it collapses the card back
    fireEvent.click(onlyGroupButton);
    expect(screen.queryByText(/Paziņojumi · No skolas/i)).toBeNull();
  });

  it("resets showAllNotes when date changes", async () => {
    const harness = await bootHarness();
    const { rerender } = renderDay(harness);

    const toggleButton = screen.getByRole("button", { name: /Visi skolas paziņojumi/ });
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Paziņojumi · No skolas/i)).toBeDefined();

    rerender(
      <StoreContext.Provider value={harness.store}>
        <DayView date="2026-09-10" onDateChange={vi.fn()} onPickClass={vi.fn()} />
      </StoreContext.Provider>,
    );

    expect(screen.queryByText(/Paziņojumi · No skolas/i)).toBeNull();
  });

  it("allows toggling show-time preference directly from DayView", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    expect(screen.getByText("Dienas skats")).toBeDefined();
    const toggle = screen.getByRole("switch", { name: "Rādīt laiku" });
    expect(toggle).toBeDefined();
    expect(harness.store.getState().settings.showTime).toBe(false);

    await clickAndSettle(() => {
      fireEvent.click(toggle);
    });

    expect(harness.store.getState().settings.showTime).toBe(true);
  });
});
