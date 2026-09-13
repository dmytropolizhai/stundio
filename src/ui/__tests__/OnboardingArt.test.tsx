/**
 * The intro tour's four illustrations.
 *
 * What makes these worth testing is that three of them are not pictures: they mount the same
 * `LessonRow` the Day screen mounts, the same DS pill the header mounts, and the same reminder
 * message `notifications/` schedules. So the assertions here are about that fidelity — plus the
 * two rules every panel has to keep: no tap affordance on a sample lesson, and no screen-reader
 * noise from a fabricated timetable.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import {
  AppScreensArt,
  ChangesArt,
  NotificationArt,
  OfflineArt,
} from "../components/OnboardingArt.tsx";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("AppScreensArt", () => {
  it("fans out every exported screen with the Day view in front", async () => {
    const harness = await bootHarness();
    const { container } = wrap(harness, <AppScreensArt />);

    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));

    expect(sources.some((src) => src?.includes("settings-view"))).toBe(true);
    expect(sources.some((src) => src?.includes("subjects-view"))).toBe(true);
    expect(sources.some((src) => src?.includes("week-view"))).toBe(true);

    /* Last in DOM order is the top of the deck, and the Day view is the tab the app opens on. */
    expect(sources.at(-1)).toContain("day-view");
  });

  /*
   * The fan mirrors the Week view on both sides, so two slots share one image file. Keying the
   * slots on `src` therefore collides, and React reconciles the pair as one element — the guard
   * is the warning, not the render, which limps along either way.
   */
  it("keys each slot in the fan separately, even where one screen appears twice", async () => {
    const harness = await bootHarness();
    const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { container } = wrap(harness, <AppScreensArt />);

    const week = [...container.querySelectorAll("img")].filter((img) =>
      img.getAttribute("src")?.includes("week-view"),
    );
    expect(week).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe("ChangesArt", () => {
  it("marks the substituted and the cancelled lesson the way the Day screen does", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesArt />);

    expect(screen.getByTestId("status-substituted")).toBeDefined();
    expect(screen.getByTestId("status-cancelled")).toBeDefined();

    /* The dot carries colour only; the word still reaches a screen reader beside it. */
    expect(screen.getByText("Aizvietota")).toBeDefined();
    expect(screen.getByText("Atcelta")).toBeDefined();
  });

  it("is an illustration, not a lesson you can open", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesArt />);

    expect(screen.queryAllByRole("button", { hidden: true })).toHaveLength(0);
  });
});

describe("OfflineArt", () => {
  it("says the copy is offline and renders the day underneath anyway", async () => {
    const harness = await bootHarness();
    wrap(harness, <OfflineArt />);

    expect(screen.getByText("Bezsaistē")).toBeDefined();
    expect(screen.getByTestId("lesson-5")).toBeDefined();
    expect(screen.getByTestId("lesson-6")).toBeDefined();
  });

  it("translates the pill with the rest of the chrome", async () => {
    const harness = await bootHarness({ lang: "ru" });
    wrap(harness, <OfflineArt />);

    expect(screen.getByText("Офлайн")).toBeDefined();
  });
});

describe("NotificationArt", () => {
  it("previews the exact reminder the app schedules", async () => {
    const harness = await bootHarness();
    wrap(harness, <NotificationArt />);

    expect(screen.getByText("Programmas izstrādes process pēc 10 min")).toBeDefined();
  });

  it("translates the chrome around it but leaves the school's own words alone", async () => {
    const harness = await bootHarness({ lang: "ru" });
    wrap(harness, <NotificationArt />);

    /* The message is translated; the subject inside it — school-written — is not (CLAUDE.md). */
    expect(screen.getByText("Programmas izstrādes process через 10 мин")).toBeDefined();
    expect(screen.getByText("244 D(30)P · Montvida Monta")).toBeDefined();
  });
});

describe("every panel", () => {
  it("stays out of the accessibility tree, because the slide's own copy carries the message", async () => {
    const harness = await bootHarness();

    for (const Art of [AppScreensArt, ChangesArt, OfflineArt, NotificationArt]) {
      const { container, unmount } = wrap(harness, <Art />);
      expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });
});
