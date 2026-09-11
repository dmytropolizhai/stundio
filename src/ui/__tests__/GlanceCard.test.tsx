/**
 * The glance card — PRODUCT.md's single stated job, "what's on now / what's next" in a
 * two-second glance. `glanceLesson()` (src/lib/schedule/nextLesson.ts) already had full
 * coverage of its own; this covers the component that finally renders it.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { rigaClock } from "../../lib/schedule/index.ts";
import { GlanceCard } from "../components/GlanceCard.tsx";
import { bootHarness, FIXTURE_DATE, type Harness } from "./harness.tsx";

/** 08:50 Riga on the fixture date: inside the first lesson (DayView.test.tsx). */
const DURING_FIRST_LESSON = new Date("2026-09-09T05:50:00Z");
/** 08:00 Riga: before the first lesson has started. */
const BEFORE_SCHOOL = new Date("2026-09-09T05:00:00Z");
/** 22:00 Riga: after every lesson of the day has ended. */
const AFTER_SCHOOL = new Date("2026-09-09T19:00:00Z");

const renderGlance = (harness: Harness, at: Date, date = FIXTURE_DATE) => {
  const day = harness.store.getState().resolvedDay(date);
  return render(
    <StoreContext.Provider value={harness.store}>
      <GlanceCard day={day} now={rigaClock(at)} />
    </StoreContext.Provider>,
  );
};

describe("GlanceCard", () => {
  it("shows the lesson in progress, with minutes left", async () => {
    const harness = await bootHarness();
    renderGlance(harness, DURING_FIRST_LESSON);

    expect(screen.getByTestId("glance-card")).toBeDefined();
    expect(screen.getByText("Tagad")).toBeDefined();
    expect(screen.getByText(/atlikušas \d+ min/)).toBeDefined();
  });

  it("marks the running lesson with the brand ring, not the upcoming one", async () => {
    const harness = await bootHarness();
    renderGlance(harness, DURING_FIRST_LESSON);
    expect(screen.getByTestId("glance-card").className).toContain("inset-ring-brand");
  });

  it("falls back to the next lesson before school starts", async () => {
    const harness = await bootHarness();
    renderGlance(harness, BEFORE_SCHOOL);

    expect(screen.getByText("Nākamā")).toBeDefined();
    expect(screen.getByText(/pēc \d+ min/)).toBeDefined();
    expect(screen.getByTestId("glance-card").className).not.toContain("inset-ring-brand");
  });

  it("says the day is over, set large, once every lesson has ended", async () => {
    const harness = await bootHarness();
    renderGlance(harness, AFTER_SCHOOL);

    const finished = screen.getByText("Stundas beigušās");
    expect(finished.className).toContain("text-display-2");
  });

  it("renders nothing on a day with no lessons", async () => {
    const harness = await bootHarness();
    renderGlance(harness, DURING_FIRST_LESSON, "2026-09-12"); // Saturday

    expect(screen.queryByTestId("glance-card")).toBeNull();
  });

  it("renders nothing when there is no resolved day", async () => {
    const harness = await bootHarness();
    render(
      <StoreContext.Provider value={harness.store}>
        <GlanceCard day={null} now={rigaClock(DURING_FIRST_LESSON)} />
      </StoreContext.Provider>,
    );

    expect(screen.queryByTestId("glance-card")).toBeNull();
  });
});
