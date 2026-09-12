/**
 * The remaining Phase 3 screens. Same rule as DayView: a real store over the `data/`
 * fixtures, no network, and assertions on behaviour a schoolmate would notice.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { WeekGrid, type WeekGridCell, type WeekGridPeriod } from "../../ds/index.ts";
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

describe("WeekGrid merge", () => {
  const days = [
    { key: "mon", weekday: "Pirmd." },
    { key: "tue", weekday: "Otrd." },
  ];
  const lvl: WeekGridCell = { short: "LVL", tone: "pink" };
  const mat: WeekGridCell = { short: "MAT", tone: "mint" };
  const periods: WeekGridPeriod<string>[] = [
    { period: 1, start: "08:30", cells: { mon: lvl } },
    { period: 2, start: "09:15", cells: { mon: lvl, tue: mat } },
    { period: 3, start: "10:10", cells: { mon: lvl } },
  ];

  it("keeps a run of identical lessons as separate cells by default", () => {
    render(<WeekGrid days={days} periods={periods} />);
    // 3 identical Monday lessons + 1 Tuesday lesson, none collapsed.
    expect(screen.getAllByTestId("week-cell")).toHaveLength(4);
  });

  it("collapses a consecutive run into one spanning cell when enabled", () => {
    render(<WeekGrid days={days} periods={periods} mergeConsecutive />);
    const cells = screen.getAllByTestId("week-cell");
    // The 3-period Monday run becomes one cell; Tuesday's single lesson is untouched.
    expect(cells).toHaveLength(2);
    const merged = cells.find((c) => c.textContent === "LVL");
    expect(merged?.style.gridRow).toBe("2 / span 3");
  });

  it("does not merge across a gap or a different subject", () => {
    const gappy: WeekGridPeriod<string>[] = [
      { period: 1, start: "08:30", cells: { mon: lvl } },
      { period: 2, start: "09:15", cells: {} },
      { period: 3, start: "10:10", cells: { mon: lvl } },
    ];
    render(<WeekGrid days={days} periods={gappy} mergeConsecutive />);
    expect(screen.getAllByTestId("week-cell")).toHaveLength(2);
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
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    expect(weekdayHeaders()).toHaveLength(5);
    // Cells carry the short subject code — the one place the DS allows an abbreviation.
    expect(screen.getAllByTestId("week-cell").length).toBeGreaterThan(0);
  });

  it("opens a lesson sheet from a cell", async () => {
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

    const cells = screen.getAllByTestId("week-cell");
    fireEvent.click(cells[0]!);

    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("jumps to the day screen when a weekday header is tapped", async () => {
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

    fireEvent.click(weekdayHeaders()[0]!);
    expect(onOpenDay).toHaveBeenCalledWith("2026-09-07");
  });

  it("steps a whole week at a time via the header arrows", async () => {
    const harness = await bootHarness();
    const onDateChange = vi.fn();
    wrap(
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
  });

  it("routes to the class picker from the header", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={onPickClass}
      />,
    );

    fireEvent.click(screen.getByTestId("class-badge"));
    expect(onPickClass).toHaveBeenCalled();
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

  it("persists the week-view merge preference", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);

    expect(harness.store.getState().settings.mergeConsecutiveLessons).toBe(false);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Apvienot vienādas stundas" }));
    });
    expect(harness.store.getState().settings.mergeConsecutiveLessons).toBe(true);
  });

  it("persists the show-time preference", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} />);

    expect(harness.store.getState().settings.showTime).toBe(false);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Rādīt laiku" }));
    });
    expect(harness.store.getState().settings.showTime).toBe(true);
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
