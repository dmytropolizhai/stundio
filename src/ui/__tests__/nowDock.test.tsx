/**
 * Contextual bottom dock (`NowDock` ↔ `DateDock`): verifies the compact live pill's subject field,
 * horizontal scratch-out reveal, matching gradient glow, upcoming fallback, and switching between
 * `NowDock` and `DateDock` inside the phone shell.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StoreContext } from "@/store";
import { bootApp } from "@/store/boot.ts";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayGlance } from "@/lib/schedule";
import { NowDock } from "../components/NowDock.tsx";
import App from "@/App.tsx";
import { bootHarness } from "./harness.tsx";

vi.mock("@/store/boot.ts", () => ({ bootApp: vi.fn() }));

const lesson = (period: string, start: string, end: string, building: string): ResolvedLesson => ({
  period,
  start,
  end,
  span: 1,
  subject: { id: `s${period}`, name: `Subject ${period}`, short: `S${period}`, color: null },
  teachers: [],
  rooms: [{ id: "r1", name: "214", short: "214" }],
  group: null,
  status: "normal",
  changeNote: null,
  original: null,
  building,
});

const DAY: ResolvedDay = {
  date: "2026-09-09",
  weekday: "wed",
  classId: "-927",
  building: "Galvenā ēka",
  buildings: ["Galvenā ēka", "TIC"],
  ttNum: "1175",
  lessons: [lesson("1", "08:30", "09:10", "Galvenā ēka"), lesson("2", "09:20", "10:00", "TIC")],
  notes: [],
  stale: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("NowDock", () => {
  it("renders the live deep subject pill with dock scratch-out, matching glow, and walk badge", async () => {
    const harness = await bootHarness();
    await harness.store.getState().setSubjectColorOverride("s1", "amber");
    await harness.store.getState().setSubjectColorOverride("s2", "pink");
    const glance = dayGlance(DAY, { date: DAY.date, minutes: 8 * 60 + 55 });
    if (glance === null || glance.kind !== "live") throw new Error("expected live glance");

    const onOpen = vi.fn();
    const onShowDate = vi.fn();
    render(
      <StoreContext.Provider value={harness.store}>
        <NowDock day={DAY} glance={glance} onOpenLesson={onOpen} onShowDateDock={onShowDate} />
      </StoreContext.Provider>,
    );

    const dock = screen.getByTestId("now-dock");
    expect(dock.getAttribute("data-kind")).toBe("live");
    expect(dock.className).toContain("u-tone-field-deep");
    expect(dock.style.getPropertyValue("--tone")).toBe("var(--accent-amber)");
    expect(dock.style.getPropertyValue("--next-tone")).toBe("var(--accent-pink)");

    const glow = screen.getByTestId("now-dock-glow");
    expect(glow.className).toContain("u-glance-glow-dock");
    expect(screen.getByTestId("now-dock-glow-next").style.getPropertyValue("--next-tone")).toBe(
      "var(--accent-pink)",
    );

    const scratch = screen.getByTestId("now-dock-scratch-layer");
    expect(scratch.style.maskImage).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(screen.getByTestId("now-dock-walk").textContent).toContain("TIC");

    fireEvent.click(screen.getByTestId("now-dock-date-toggle"));
    expect(onShowDate).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Subject 1/ }));
    expect(onOpen).toHaveBeenCalledWith(DAY.lessons[0]);
  });

  it("scratches the upcoming lesson out from the previous lesson during a mid-day break", async () => {
    const harness = await bootHarness();
    await harness.store.getState().setSubjectColorOverride("s1", "amber");
    await harness.store.getState().setSubjectColorOverride("s2", "pink");
    const glance = dayGlance(DAY, { date: DAY.date, minutes: 9 * 60 + 14 }); // 6 min before lesson 2
    if (glance === null || glance.kind !== "upcoming") throw new Error("expected upcoming glance");

    render(
      <StoreContext.Provider value={harness.store}>
        <NowDock day={DAY} glance={glance} onOpenLesson={vi.fn()} />
      </StoreContext.Provider>,
    );

    const dock = screen.getByTestId("now-dock");
    expect(dock.getAttribute("data-kind")).toBe("upcoming");
    expect(dock.className).toContain("u-tone-field-deep");
    expect(dock.style.getPropertyValue("--tone")).toBe("var(--accent-amber)");
    expect(dock.style.getPropertyValue("--next-tone")).toBe("var(--accent-pink)");
    expect(screen.getByTestId("now-dock-glow")).toBeDefined();
    expect(screen.getByTestId("now-dock-glow-next").style.getPropertyValue("--next-tone")).toBe(
      "var(--accent-pink)",
    );
    const scratch = screen.getByTestId("now-dock-scratch-layer");
    expect(scratch.style.getPropertyValue("--tone")).toBe("var(--accent-pink)");
    expect(scratch.style.maskImage).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(screen.queryByTestId("now-dock-date-toggle")).toBeNull();
  });

  it("renders the upcoming subject field without scratches before the first lesson of the day", async () => {
    const harness = await bootHarness();
    await harness.store.getState().setSubjectColorOverride("s1", "sky");
    const glance = dayGlance(DAY, { date: DAY.date, minutes: 8 * 60 + 15 });
    if (glance === null || glance.kind !== "upcoming") throw new Error("expected upcoming glance");

    render(
      <StoreContext.Provider value={harness.store}>
        <NowDock day={DAY} glance={glance} onOpenLesson={vi.fn()} />
      </StoreContext.Provider>,
    );

    const dock = screen.getByTestId("now-dock");
    expect(dock.style.getPropertyValue("--tone")).toBe("var(--accent-sky)");
    expect(screen.queryByTestId("now-dock-scratch-layer")).toBeNull();
    expect(screen.queryByTestId("now-dock-glow-next")).toBeNull();
  });

  it("swaps between NowDock and DateDock in the phone shell and stays visible across tabs", async () => {
    vi.stubGlobal("matchMedia", undefined);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-09T05:45:00Z")); // 08:45 Europe/Riga (mid-lesson 1)

    const harness = await bootHarness({
      lang: "en",
      teacherAnnouncementDismissed: true,
      lastSeenChangelogVersion: __APP_VERSION__,
      iphoneInstallPromptDismissed: true,
    });
    vi.mocked(bootApp).mockResolvedValue({ store: harness.store });
    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    expect(screen.getByTestId("now-dock")).toBeDefined();
    expect(screen.getByTestId("now-dock").parentElement?.className).not.toContain(
      "u-dock-bimp-from-chip",
    );
    expect(screen.queryByTestId("date-dock")).toBeNull();
    expect(screen.queryByTestId("day-glance")).toBeNull();

    // Toggle to DateDock via the calendar button — expands horizontally from the right icon
    fireEvent.click(screen.getByTestId("now-dock-date-toggle"));
    expect(screen.getByTestId("date-dock").className).toContain("u-dock-bimp-from-right");
    await waitFor(() => {
      expect(screen.queryByTestId("now-dock")).toBeNull();
    });

    // Flip back to NowDock via the compact subject chip — expands horizontally from the chip
    fireEvent.click(screen.getByTestId("dock-now-toggle"));
    expect(screen.getByTestId("now-dock").parentElement?.className).toContain(
      "u-dock-bimp-from-chip",
    );
    await waitFor(() => {
      expect(screen.queryByTestId("date-dock")).toBeNull();
    });

    // Switch to Changes tab — NowDock stays docked above TabBar without the calendar toggle
    fireEvent.click(screen.getByRole("button", { name: /Changes/ }));
    expect(screen.getByTestId("now-dock")).toBeDefined();
    expect(screen.queryByTestId("now-dock-date-toggle")).toBeNull();
  });
});
