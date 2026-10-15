/** Transit uses cached campus data and plain Maps links; address edits persist only on blur. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import type { Timetable } from "@/lib/edupage";
import { TransitView } from "../screens/transit-view";
import { LiveMapCard, SLOW_MAP_MS } from "../screens/transit-view/live-map-card.tsx";
import { CommuteSection } from "../screens/settings-view/commute-section.tsx";
import { SettingsView } from "../screens/settings-view";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

const clock = vi.hoisted(() => ({ date: "2026-09-09", minutes: 7 * 60 }));
vi.mock("../hooks/useNow.ts", () => ({ useNow: () => clock }));

const timetable = (building: string, period: string): Timetable => ({
  meta: {
    building,
    ttNum: building,
    validFrom: "2026-09-07",
    schoolYear: 2026,
    label: building,
    fetchedAt: "2026-09-09T00:00:00Z",
  },
  periods: [
    { period: "1", name: "1", start: "08:00", end: "08:40" },
    { period: "2", name: "2", start: "09:00", end: "09:40" },
  ],
  classes: [{ id: "class", short: "A", name: "A" }],
  teachers: [],
  rooms: [],
  subjects: [{ id: "subject", short: "M", name: "Math" }],
  lessons: [
    {
      id: building,
      classIds: ["class"],
      groups: [],
      subjectId: "subject",
      teacherIds: [],
      roomIds: [],
      day: "wed",
      period,
      periodSpan: 1,
      weekMask: "1",
      termMask: "1",
    },
  ],
});

const setup = async (home = "") => {
  const harness = await bootHarness({ selectedClassId: "class", commuteHome: home, lang: "en" });
  const tables = [timetable("TIC", "1"), timetable("New campus", "2")];
  harness.store.setState({
    metas: tables.map((t) => t.meta),
    timetables: Object.fromEntries(tables.map((t) => [t.meta.ttNum, t])),
    substitutions: {},
  });
  return harness;
};
const wrap = (harness: Harness, node: React.ReactNode = <TransitView />) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);
const links = () => screen.queryAllByRole<HTMLAnchorElement>("link", { name: "Open Google Maps" });
const params = (index = 0) => new URL(links()[index]?.href ?? "https://invalid.test").searchParams;

beforeEach(() => {
  clock.minutes = 7 * 60;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Transit", () => {
  it("uses home as origin and the next lesson's campus, with ordinary external links", async () => {
    const harness = await setup("Brīvības iela 10, Rīga");
    wrap(harness);
    expect(params().get("origin")).toBe("Brīvības iela 10, Rīga");
    expect(params().get("destination")).toBe("Rīgas Valsts tehnikums, TIC");
    expect(params().get("travelmode")).toBe("transit");
    expect(links()[0]?.target).toBe("_blank");
    expect(links()[0]?.rel).toBe("noreferrer");
    const frame = screen.getByTitle("Rīgas satiksme live transit map");
    expect(frame.getAttribute("src")).toBe("https://saraksti.lv/#riga/map");
    expect(frame.hasAttribute("allow")).toBe(false);
  });

  it("lets Maps choose the origin when no home address exists", async () => {
    wrap(await setup());
    expect(params().has("origin")).toBe(false);
    expect(screen.getByText("From current location")).toBeDefined();
  });

  it("follows the current lesson, then a later lesson in another building", async () => {
    clock.minutes = 8 * 60 + 10;
    const harness = await setup();
    const { unmount } = wrap(harness);
    expect(params().get("destination")).toContain("TIC");
    unmount();
    clock.minutes = 8 * 60 + 45;
    wrap(harness);
    expect(params().get("destination")).toContain("New campus");
  });

  it("honours a pinned building and a manual choice, resetting the choice on a pin change", async () => {
    const harness = await setup();
    wrap(harness);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "New campus" } });
    expect(params().get("destination")).toContain("New campus");
    await clickAndSettle(() => {
      void harness.store.getState().setBuilding("TIC");
    });
    expect(params().get("destination")).toContain("TIC");
    await clickAndSettle(() => {
      void harness.store.getState().setBuilding("New campus");
    });
    expect(params().get("destination")).toContain("New campus");
  });

  it("asks for a campus after lessons end instead of guessing among buildings", async () => {
    clock.minutes = 18 * 60;
    wrap(await setup());
    expect(links()).toHaveLength(0);
    expect(screen.getByText(/Choose the destination building/)).toBeDefined();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "New campus" } });
    expect(params().get("destination")).toContain("New campus");
  });

  it("can use the sole published campus without a lesson or class", async () => {
    const harness = await setup();
    const only = timetable("Future campus", "1");
    harness.store.setState({
      metas: [only.meta],
      settings: { ...harness.store.getState().settings, selectedClassId: null },
    });
    wrap(harness);
    expect(params().get("destination")).toContain("Future campus");
  });

  it("does not fabricate routes before any timetables are cached", async () => {
    const harness = await setup();
    harness.store.setState({ metas: [], timetables: {} });
    wrap(harness);
    expect(links()).toHaveLength(0);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText(/refresh your timetable/)).toBeDefined();
  });

  it("adds and removes saved origins and clears the form, without losing addresses on hydrate", async () => {
    const harness = await setup("Home");
    wrap(harness);
    const name = screen.getByRole<HTMLInputElement>("textbox", { name: "Place name" });
    const address = screen.getByRole<HTMLInputElement>("textbox", { name: "Address" });
    fireEvent.change(name, { target: { value: "  Work  " } });
    fireEvent.change(address, { target: { value: "  Krišjāņa Valdemāra iela 1C, Rīga  " } });
    await clickAndSettle(() => {
      fireEvent.submit(name.closest("form")!);
    });
    expect(params(1).get("origin")).toBe("Krišjāņa Valdemāra iela 1C, Rīga");
    expect(name.value).toBe("");
    expect(address.value).toBe("");
    await act(async () => {
      await harness.store.getState().hydrate();
    });
    expect(harness.store.getState().settings.transitDestinations).toHaveLength(1);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Remove Work" }));
    });
    expect((await harness.cache.getSettings()).transitDestinations).toEqual([]);
  });

  it("ignores whitespace-only input and can save on a device without randomUUID", async () => {
    const harness = await setup();
    wrap(harness);
    const name = screen.getByRole<HTMLInputElement>("textbox", { name: "Place name" });
    const address = screen.getByRole("textbox", { name: "Address" });
    fireEvent.change(name, { target: { value: "   " } });
    fireEvent.change(address, { target: { value: "Somewhere" } });
    fireEvent.submit(name.closest("form")!);
    expect(harness.store.getState().settings.transitDestinations).toEqual([]);
    vi.stubGlobal("crypto", undefined);
    fireEvent.change(name, { target: { value: "Work" } });
    await clickAndSettle(() => {
      fireEvent.submit(name.closest("form")!);
    });
    expect(harness.store.getState().settings.transitDestinations[0]?.id).toBeTruthy();
  });
});

describe("Commute settings", () => {
  it("keeps keystrokes local, trims on blur, persists and avoids redundant writes", async () => {
    const harness = await setup("Old home");
    const put = vi.spyOn(harness.cache, "putSettings");
    const { unmount } = wrap(harness, <CommuteSection />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Home address" });
    fireEvent.change(input, { target: { value: "N" } });
    fireEvent.change(input, { target: { value: "  New home  " } });
    expect(put).not.toHaveBeenCalled();
    expect(harness.store.getState().settings.commuteHome).toBe("Old home");
    await clickAndSettle(() => {
      fireEvent.blur(input);
    });
    expect(input.value).toBe("New home");
    expect(put).toHaveBeenCalledOnce();
    await clickAndSettle(() => {
      fireEvent.blur(input);
    });
    expect(put).toHaveBeenCalledOnce();
    unmount();
    await harness.store.getState().hydrate();
    wrap(harness, <CommuteSection />);
    expect(screen.getByDisplayValue("New home")).toBeDefined();
  });

  it("clears home and follows externally changed settings when no draft exists", async () => {
    const harness = await setup("Old home");
    wrap(harness, <CommuteSection />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Home address" });
    await clickAndSettle(() => {
      void harness.store.getState().setCommuteHome("Updated");
    });
    expect(input.value).toBe("Updated");
    fireEvent.change(input, { target: { value: "" } });
    await clickAndSettle(() => {
      fireEvent.blur(input);
    });
    expect((await harness.cache.getSettings()).commuteHome).toBe("");
  });

  it("shows commute settings only for roles with the transit tab", async () => {
    const harness = await setup();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Home address" })).toBeDefined();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
    });
    expect(screen.queryByRole("textbox", { name: "Home address" })).toBeNull();
  });
});

describe("Live map connection warning", () => {
  const frame = () => screen.getByTitle("Rīgas satiksme live transit map");
  const warning = () => screen.queryByRole("status");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("warns while offline and reloads the map once the connection is back", async () => {
    const harness = await setup();
    harness.store.setState({ syncStatus: "offline" });
    wrap(harness, <LiveMapCard />);
    expect(warning()?.textContent).toContain("No internet connection");
    const offlineFrame = frame();

    act(() => {
      harness.store.setState({ syncStatus: "idle" });
    });
    expect(warning()).toBeNull();
    expect(frame()).not.toBe(offlineFrame);
  });

  it("warns about a slow connection only when the map has not loaded in time", async () => {
    const harness = await setup();
    vi.useFakeTimers();
    wrap(harness, <LiveMapCard />);
    act(() => {
      vi.advanceTimersByTime(SLOW_MAP_MS - 1);
    });
    expect(warning()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(warning()?.textContent).toContain("Slow connection");

    fireEvent.load(frame());
    expect(warning()).toBeNull();
  });

  it("stays quiet when the map loads quickly", async () => {
    const harness = await setup();
    vi.useFakeTimers();
    wrap(harness, <LiveMapCard />);
    fireEvent.load(frame());
    act(() => {
      vi.advanceTimersByTime(SLOW_MAP_MS);
    });
    expect(warning()).toBeNull();
  });

  it("restarts the slow-load clock for each reload after going offline", async () => {
    const harness = await setup();
    vi.useFakeTimers();
    wrap(harness, <LiveMapCard />);
    fireEvent.load(frame());
    act(() => {
      harness.store.setState({ syncStatus: "offline" });
    });
    act(() => {
      harness.store.setState({ syncStatus: "idle" });
    });
    expect(warning()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SLOW_MAP_MS);
    });
    expect(warning()?.textContent).toContain("Slow connection");
  });
});
