/**
 * The remaining Phase 3 screens. Same rule as DayView: a real store over the `data/`
 * fixtures, no network, and assertions on behaviour a schoolmate would notice.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { ClassPicker } from "../screens/ClassPicker.tsx";
import { WeekView } from "../screens/WeekView.tsx";
import { SettingsView } from "../screens/SettingsView.tsx";
import { applyTheme, resolveTheme } from "../theme/index.ts";
import { bootHarness, classIdOf, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("ClassPicker", () => {
  it("lists every cached class and filters as you type", async () => {
    const harness = await bootHarness();
    wrap(harness, <ClassPicker />);

    expect(screen.getAllByRole("button", { pressed: false }).length).toBeGreaterThan(50);

    fireEvent.change(screen.getByLabelText("Meklēt klasi…"), { target: { value: "a1-" } });
    const shown = screen.getAllByText(/^A1-/);
    expect(shown.length).toBeGreaterThan(0);
    expect(screen.queryByText("DT3-2")).toBeNull();
  });

  it("says so when nothing matches instead of showing an empty list", async () => {
    const harness = await bootHarness();
    wrap(harness, <ClassPicker />);

    fireEvent.change(screen.getByLabelText("Meklēt klasi…"), { target: { value: "zzz" } });
    expect(screen.getByText("Nav atrasta neviena klase")).toBeDefined();
  });

  it("remembers the pick and tells the caller", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    const onPicked = vi.fn();
    wrap(harness, <ClassPicker onPicked={onPicked} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("DT3-2"));
    });

    expect(onPicked).toHaveBeenCalled();
    expect(harness.store.getState().settings.selectedClassId).not.toBeNull();
  });

  it("pins favourites above the rest", async () => {
    const harness = await bootHarness();
    wrap(harness, <ClassPicker />);

    await clickAndSettle(() => {
      const row = screen.getByText("DT3-2").closest("li")!;
      fireEvent.click(within(row).getByLabelText("Pievienot izlasei"));
    });

    expect(harness.store.getState().settings.favorites).toEqual([
      classIdOf(harness.store, "DT3-2"),
    ]);
    expect(screen.getByText("Izlase")).toBeDefined();
  });

  it("shows the building next to the class, since names repeat across the two", async () => {
    const harness = await bootHarness();
    wrap(harness, <ClassPicker />);
    expect(screen.getAllByText(/Galvenā ēka|TIC/).length).toBeGreaterThan(0);
  });
});

describe("WeekView", () => {
  /*
   * The design system's week grid heads each column with the weekday alone — the day-and-month
   * line the old grid carried does not fit the 3-letter cell rhythm. Locale spelling comes from
   * `Intl`, so these match on the shape rather than hardcoding "Pr"/"Pk".
   */
  const weekdayHeaders = () =>
    screen.getAllByRole("button").filter((b) => b.className.includes("tracking-label"));

  it("renders a Mon–Fri grid of the class's week", async () => {
    const harness = await bootHarness();
    wrap(harness, <WeekView date={FIXTURE_DATE} onOpenDay={vi.fn()} />);

    expect(weekdayHeaders()).toHaveLength(5);
    // Cells carry the short subject code — the one place the DS allows an abbreviation.
    const filled = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("h-10") && b.textContent !== "");
    expect(filled.length).toBeGreaterThan(0);
  });

  it("opens a lesson sheet from a cell", async () => {
    const harness = await bootHarness();
    wrap(harness, <WeekView date={FIXTURE_DATE} onOpenDay={vi.fn()} />);

    const cells = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("h-10") && b.textContent !== "");
    fireEvent.click(cells[0]!);

    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("jumps to the day screen when a weekday header is tapped", async () => {
    const harness = await bootHarness();
    const onOpenDay = vi.fn();
    wrap(harness, <WeekView date={FIXTURE_DATE} onOpenDay={onOpenDay} />);

    fireEvent.click(weekdayHeaders()[0]!);
    expect(onOpenDay).toHaveBeenCalledWith("2026-09-07");
  });
});

describe("SettingsView", () => {
  it("writes the language through to the cache and re-renders in it", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("English"));
    });

    expect(harness.store.getState().settings.lang).toBe("en");
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("persists the theme choice", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Tumšs"));
    });
    expect(harness.store.getState().settings.theme).toBe("dark");
  });

  it("offers a building override once more than one building is cached", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);

    const auto = screen.queryByText("Automātiski");
    // The fixture list carries both buildings, so the control is present.
    expect(auto).not.toBeNull();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("TIC"));
    });
    expect(harness.store.getState().settings.building).toBe("TIC");
  });

  it("refreshes on demand", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);
    const before = harness.server.calls.substitutions;

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Atjaunināt"));
    });
    expect(harness.server.calls.substitutions).toBeGreaterThan(before);
  });

  it("names the current class and routes to the picker", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    wrap(harness, <SettingsView onPickClass={onPickClass} />);

    // Twice now: once as the header eyebrow, once as the value of the class row.
    expect(screen.getAllByText("A1-2").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Mainīt"));
    expect(onPickClass).toHaveBeenCalled();
  });
});

describe("theme", () => {
  it("follows the system only when set to system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("toggles the class Tailwind's dark variant keys off", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
