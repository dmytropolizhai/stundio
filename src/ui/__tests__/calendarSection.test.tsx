/**
 * Settings → Calendar: each row routes the export to its target, the "only changed lessons"
 * switch persists and is passed along, and the outcome is announced politely.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, act, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

const route = vi.hoisted(() => vi.fn());
vi.mock("@/lib/calendar", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, routeCalendarExport: route };
});

import { StoreContext } from "@/store";
import { CalendarSection } from "../screens/settings-view/calendar-section.tsx";
import { useCalendarExport } from "../calendar/useCalendarExport.ts";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

/** Opens the target sheet from the section's "Add to calendar" row, then taps one target. */
const pick = async (name: RegExp | string) => {
  await clickAndSettle(() => screen.getByRole("button", { name: /Pievienot kalendāram/ }).click());
  await clickAndSettle(() => screen.getByRole("button", { name: new RegExp(name) }).click());
};

const renderSection = (h: Harness) =>
  render(
    <StoreContext.Provider value={h.store}>
      <CalendarSection />
    </StoreContext.Provider>,
  );

describe("CalendarSection", () => {
  beforeEach(() => {
    route.mockReset();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-09T08:00:00Z") });
  });

  it("routes each target and announces the exported count", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "link-opened", eventCount: 7 });
    renderSection(h);

    for (const [name, target] of [
      ["Google Calendar", "google"],
      ["Apple Calendar", "apple"],
      ["Outlook", "outlook"],
      ["Saglabāt failu", "ics"],
    ] as const) {
      await pick(name);
      expect(route).toHaveBeenLastCalledWith(
        target,
        expect.any(Array),
        expect.objectContaining({ name: "Stundio · A1-2", changesOnly: false }),
      );
    }
    expect(screen.getByRole("status").textContent).toContain("Eksportētas stundas: 7");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it("passes the changes-only setting along", async () => {
    const h = await bootHarness({ calendarChangesOnly: true });
    route.mockResolvedValue({ kind: "nothing-to-export" });
    renderSection(h);

    await pick(/Google Calendar/);
    expect(route.mock.calls[0]?.[2]).toMatchObject({ changesOnly: true });
    expect(screen.getByRole("status").textContent).toContain("nav izmaiņu");
  });

  it("shows the scope on the row and the outcome there after a tap", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "link-opened", eventCount: 2 });
    renderSection(h);
    const row = () => screen.getByRole("button", { name: /Pievienot kalendāram/ });
    expect(row().textContent).toContain("4 nedēļas · visas");
    await clickAndSettle(() => screen.getByRole("switch").click());
    expect(row().textContent).toContain("4 nedēļas · izmaiņas");
    await pick(/Google Calendar/);
    expect(row().textContent).toContain("Gatavs");
  });

  it("lets the student name the calendar and uses it for the export", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "link-opened", eventCount: 1 });
    renderSection(h);
    const input = screen.getByLabelText(/Kalendāra nosaukums/);
    act(() => {
      fireEvent.change(input, { target: { value: "  Skola  " } });
      fireEvent.blur(input);
    });
    expect(h.store.getState().settings.calendarName).toBe("Skola");
    await pick(/Google Calendar/);
    expect(route.mock.calls[0]?.[2]).toMatchObject({ name: "Skola" });
  });

  it("falls back to the class name when the custom name is cleared", async () => {
    const h = await bootHarness({ calendarName: "Skola" });
    route.mockResolvedValue({ kind: "link-opened", eventCount: 1 });
    renderSection(h);
    const input = screen.getByLabelText(/Kalendāra nosaukums/);
    act(() => {
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);
    });
    await pick(/Google Calendar/);
    expect(route.mock.calls[0]?.[2]).toMatchObject({ name: "Stundio · A1-2" });
  });

  it("shows Google's import page as a link after the file went out", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({
      kind: "file",
      via: "download",
      eventCount: 4,
      followUp: "https://calendar.google.com/calendar/u/0/r/settings/export",
    });
    renderSection(h);
    expect(screen.queryByRole("link")).toBeNull();
    await pick(/Google Calendar/);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("calendar.google.com");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("toggles the setting", async () => {
    const h = await bootHarness();
    renderSection(h);
    await clickAndSettle(() => screen.getByRole("switch").click());
    expect(h.store.getState().settings.calendarChangesOnly).toBe(true);
  });

  it("ignores a second tap while an export is in flight", async () => {
    const h = await bootHarness();
    let finish: (v: unknown) => void = () => undefined;
    route.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderSection(h);
    await pick(/Google Calendar/);
    const row = screen.getByRole("button", { name: /Pievienot kalendāram/ });
    expect((row as HTMLButtonElement).disabled).toBe(true);
    expect(route).toHaveBeenCalledTimes(1);
    await clickAndSettle(() => finish({ kind: "link-opened", eventCount: 1 }));
  });

  it("sends Google exports offline as a plain file and explains the import step", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "file", via: "download", eventCount: 3 });
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderSection(h);
    await pick(/Google Calendar/);
    online.mockRestore();
    expect(route.mock.calls[0]?.[0]).toBe("ics");
    expect(screen.getByRole("status").textContent).toContain("internets");
  });

  it("reports a failed export", async () => {
    const h = await bootHarness();
    route.mockRejectedValue(new Error("boom"));
    renderSection(h);
    await pick(/Apple Calendar/);
    expect(screen.getByRole("status").textContent).toContain("Neizdevās eksportēt");
  });
});

describe("useCalendarExport", () => {
  beforeEach(() => {
    route.mockReset();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-09T08:00:00Z") });
  });

  const wrap = (h: Harness) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <StoreContext.Provider value={h.store}>{children}</StoreContext.Provider>
    );
    return Wrapper;
  };

  it("exports Riga's current week plus three, and treats a cancelled sheet as idle", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "cancelled" });
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });

    await act(() => result.current.exportTo("ics"));

    const context = route.mock.calls[0]?.[2] as { range: { from: string; to: string } };
    expect(context.range).toEqual({ from: "2026-09-07", to: "2026-10-02" });
    expect(result.current.status).toBe("idle");
    expect(result.current.lastOutcome).toEqual({ kind: "cancelled" });
  });

  it("counts the events a file export carried", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "file", via: "download", eventCount: 12 });
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("apple"));
    expect(result.current.status).toBe("done");
    expect(result.current.eventCount).toBe(12);
  });
});
