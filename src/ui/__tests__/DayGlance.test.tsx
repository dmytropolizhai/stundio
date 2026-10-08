/**
 * The glance card's building walk, which the fixture day (one building) never reaches: the
 * warning has to name the building to go to, and from where when the student is mid-break.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayGlance } from "@/lib/schedule";
import { DayGlance } from "../screens/home-view/day-glance.tsx";
import { bootHarness } from "./harness.tsx";

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

const renderGlance = async (minutes: number) => {
  const harness = await bootHarness();
  const glance = dayGlance(DAY, { date: DAY.date, minutes });
  if (glance === null || glance.kind === "finished") throw new Error("no glance");
  render(
    <StoreContext.Provider value={harness.store}>
      <DayGlance day={DAY} glance={glance} onOpenLesson={vi.fn()} />
    </StoreContext.Provider>,
  );
};

describe("DayGlance", () => {
  it("warns about the walk to the other building while a lesson is still on", async () => {
    await renderGlance(8 * 60 + 40);
    expect(screen.getByTestId("glance-walk").textContent).toBe("Jādodas uz TIC");
    expect(screen.getByTestId("glance-following").textContent).toContain("Subject 2");
  });

  it("names where to walk from during the break", async () => {
    await renderGlance(9 * 60 + 12);
    expect(screen.getByTestId("glance-walk").textContent).toBe("Pāreja no Galvenā ēka uz TIC");
    expect(screen.getByTestId("glance-room").textContent).toBe("214");
  });
});
