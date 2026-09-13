/**
 * The remaining Phase 3 screens. Same rule as DayView: a real store over the `data/`
 * fixtures, no network, and assertions on behaviour a schoolmate would notice.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    { period: 1, start: "08:30", end: "09:15", cells: { mon: lvl } },
    { period: 2, start: "09:15", end: "10:10", cells: { mon: lvl, tue: mat } },
    { period: 3, start: "10:10", end: "10:55", cells: { mon: lvl } },
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
      { period: 1, start: "08:30", end: "09:15", cells: { mon: lvl } },
      { period: 2, start: "09:15", end: "10:10", cells: {} },
      { period: 3, start: "10:10", end: "10:55", cells: { mon: lvl } },
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

  it("says nothing about buildings when the whole week is in the main one", async () => {
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

    expect(screen.queryByTestId("week-buildings")).toBeNull();
  });

  it("lists which weekdays are in another building", async () => {
    const harness = await bootHarness({ building: "TIC" });
    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    // Every fixture weekday resolves to the pinned annex, so it names them all.
    const note = screen.getByTestId("week-buildings").textContent ?? "";
    expect(note).toContain("TIC:");
    expect(note.split(",").length).toBeGreaterThan(1);
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

  /*
   * Sharing, end to end through the screen: happy-dom has no canvas and no share sheet, so both
   * are stood in for — what is under test is that a tap really draws the week and really hands
   * the PNG to whatever the platform offers, and that a platform that can do neither says so
   * instead of failing silently.
   */
  describe("sharing the week as an image", () => {
    type StubbedCanvas = { getContext: unknown; toDataURL: unknown };
    const canvasPrototype = HTMLCanvasElement.prototype as unknown as StubbedCanvas;
    const realCanvas: StubbedCanvas = { ...canvasPrototype };

    const stubCanvas = (context: unknown) => {
      canvasPrototype.getContext = () => context;
      canvasPrototype.toDataURL = () => "data:image/png;base64,QUJD";
    };

    const drawingContext = () => ({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      globalAlpha: 1,
    });

    const renderWeek = (harness: Harness) =>
      wrap(
        harness,
        <WeekView
          date={FIXTURE_DATE}
          onDateChange={vi.fn()}
          onOpenDay={vi.fn()}
          onPickClass={vi.fn()}
        />,
      );

    afterEach(() => {
      vi.unstubAllGlobals();
      Object.assign(canvasPrototype, realCanvas);
    });

    it("paints the card and passes it to the share sheet, with the class on it", async () => {
      const harness = await bootHarness();
      const ctx = drawingContext();
      stubCanvas(ctx);

      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { share, canShare: () => true });

      renderWeek(harness);
      fireEvent.click(screen.getByTestId("share-week"));

      await waitFor(() => {
        expect(share).toHaveBeenCalled();
      });

      const drawn = ctx.fillText.mock.calls.map(([text]) => text as string);
      expect(drawn).toContain("A1-2");
      expect(drawn.some((text) => text.startsWith("–"))).toBe(true); // a lesson's end time

      const sent = share.mock.calls[0]?.[0] as { text: string; files: File[] };
      expect(sent.text).toContain("https://github.com/dmytropolizhai/stundio/releases");
      expect(sent.files[0]?.name).toContain("a1-2");
    });

    it("tells the user when the card cannot be drawn at all", async () => {
      const harness = await bootHarness();
      stubCanvas(null);

      renderWeek(harness);
      fireEvent.click(screen.getByTestId("share-week"));

      expect(await screen.findByText("Neizdevās sagatavot attēlu")).toBeDefined();
    });

    it("stays quiet when the share sheet is dismissed — that is not a failure", async () => {
      const harness = await bootHarness();
      stubCanvas(drawingContext());

      const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
      const share = vi.fn().mockRejectedValue(abort);
      vi.stubGlobal("navigator", { share, canShare: () => true });

      renderWeek(harness);
      fireEvent.click(screen.getByTestId("share-week"));

      await waitFor(() => {
        expect(share).toHaveBeenCalled();
      });
      expect(screen.queryByText("Neizdevās sagatavot attēlu")).toBeNull();
    });

    it("offers nothing to share before a class is picked", async () => {
      const harness = await bootHarness({ selectedClassId: null });
      renderWeek(harness);

      expect(screen.queryByTestId("share-week")).toBeNull();
    });
  });
});

describe("SettingsView", () => {
  it("writes the language through to the cache and re-renders in it", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("English"));
    });

    expect(harness.store.getState().settings.lang).toBe("en");
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("persists the theme choice", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Tumšs"));
    });
    expect(harness.store.getState().settings.theme).toBe("dark");
  });

  it("persists the week-view merge preference", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    expect(harness.store.getState().settings.mergeConsecutiveLessons).toBe(false);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Apvienot vienādas stundas" }));
    });
    expect(harness.store.getState().settings.mergeConsecutiveLessons).toBe(true);
  });

  it("persists the show-time preference", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    expect(harness.store.getState().settings.showTime).toBe(false);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Rādīt laiku" }));
    });
    expect(harness.store.getState().settings.showTime).toBe(true);
  });

  it("offers a building override once more than one building is cached", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

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
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);
    const before = harness.server.calls.substitutions;

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Atjaunināt"));
    });
    expect(harness.server.calls.substitutions).toBeGreaterThan(before);
  });

  it("names the current class and routes to the picker", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    wrap(harness, <SettingsView onPickClass={onPickClass} onShowWhatsNew={vi.fn()} />);

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
