/**
 * The intro tour's four live Night / Day specimens and welcome flow controls.
 *
 * All four panels mount real app components (`DayGlassLesson`, `SyncStatus`, and the exact
 * `notification.lessonReminder.title` copy `notifications/` schedules) rather than static images.
 * The assertions verify that fidelity plus the two invariants every panel must keep: no tap
 * affordance on a sample lesson, and no screen-reader noise from a fabricated timetable.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { Button } from "@/ds";
import {
  AppScreensArt,
  ChangesArt,
  NotificationArt,
  OfflineArt,
} from "../components/OnboardingArt.tsx";
import { OnboardingIntro } from "../screens/onboarding-intro";
import { OnboardingLanguage } from "../screens/onboarding-language";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("AppScreensArt", () => {
  it("renders a live Night/Day Home specimen with a lifted active lesson and next row", async () => {
    const harness = await bootHarness();
    wrap(harness, <AppScreensArt />);

    expect(screen.getByTestId("home-preview-art")).toBeDefined();
    expect(screen.getByTestId("lesson-5").getAttribute("data-live")).toBe("true");
    expect(screen.getByTestId("status-now")).toBeDefined();
    expect(screen.getByTestId("lesson-6")).toBeDefined();
  });

  it("is a specimen, not interactive lessons you can open", async () => {
    const harness = await bootHarness();
    wrap(harness, <AppScreensArt />);

    expect(screen.queryAllByRole("button", { hidden: true })).toHaveLength(0);
  });
});

describe("ChangesArt", () => {
  it("marks the substituted and the cancelled lesson the way the Home screen does", async () => {
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

    /* The message is translated; the subject inside it — school-written — is not (AGENT.md). */
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

describe("OnboardingIntro", () => {
  it("starts on language selection, steps forward/back, jumps via tabs, and finishes on the last slide", async () => {
    const harness = await bootHarness({ lang: "lv" });
    const onDone = vi.fn();
    wrap(harness, <OnboardingIntro onDone={onDone} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Izvēlies valodu");
    expect(screen.queryByRole("button", { name: "Atpakaļ" })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /English/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Choose your language");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Choose your institution");
    expect(
      screen.getByRole("radio", { name: /Rīgas Valsts tehnikums/ }).getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your timetable, in one place",
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Choose your institution");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Choose your language");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    const lastTab = tabs[5];
    if (lastTab !== undefined) fireEvent.click(lastTab);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Notified about what matters",
    );

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("lets the user skip immediately from any step", async () => {
    const harness = await bootHarness({ lang: "en" });
    const onDone = vi.fn();
    wrap(harness, <OnboardingIntro onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingLanguage", () => {
  it("renders all languages in a radio group with Ukrainian above Russian, switches locale, and advances on continue", async () => {
    const harness = await bootHarness({ lang: "lv" });
    const onDone = vi.fn();
    wrap(harness, <OnboardingLanguage onDone={onDone} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(20);
    const uaIndex = radios.findIndex((r) => /Українська/.test(r.textContent ?? ""));
    const ruIndex = radios.findIndex((r) => /Русский/.test(r.textContent ?? ""));
    expect(uaIndex).toBeGreaterThanOrEqual(0);
    expect(ruIndex).toBeGreaterThan(uaIndex);
    expect(screen.getByRole("radio", { name: /Latviešu/ }).getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: /English/ }));
    expect(harness.store.getState().settings.lang).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("DS Button", () => {
  it("supports the Night/Day variants including glass and icons", () => {
    const { rerender } = render(
      <Button variant="glass" size="sm" icon="arrow-left">
        Back
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Back" });
    expect(btn.className).toContain("u-nav-glass");

    rerender(
      <Button variant="primary" size="lg" block iconEnd="arrow-right">
        Continue
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Continue" }).className).toContain("u-btn-primary");
  });
});
