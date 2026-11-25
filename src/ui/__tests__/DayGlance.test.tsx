/**
 * The glance card's live subject field, scratch-out reveal of the next lesson, matching gradient
 * glow, and building-walk warnings (which the single-building fixture day never reaches).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import type { SubjectColorValue } from "@/db";
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

const renderGlance = async (
  minutes: number,
  overrides?: { subjectColorOverrides?: Record<string, SubjectColorValue> },
) => {
  const harness = await bootHarness();
  if (overrides?.subjectColorOverrides !== undefined) {
    for (const [key, tone] of Object.entries(overrides.subjectColorOverrides)) {
      await harness.store.getState().setSubjectColorOverride(key, tone);
    }
  }
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

  it("names where to walk from during the break and scratches the next lesson over the previous one", async () => {
    await renderGlance(9 * 60 + 14, {
      subjectColorOverrides: { s1: "amber", s2: "pink" },
    });
    expect(screen.getByTestId("glance-walk").textContent).toBe("Pāreja no Galvenā ēka uz TIC");
    expect(screen.getByTestId("glance-room").textContent).toBe("214");
    expect(screen.getByTestId("glance-glow")).toBeDefined();
    expect(screen.getByTestId("glance-glow-next").style.getPropertyValue("--next-tone")).toBe(
      "var(--accent-pink)",
    );
    const scratch = screen.getByTestId("glance-scratch-layer");
    expect(scratch.style.getPropertyValue("--tone")).toBe("var(--accent-pink)");
    expect(scratch.style.maskImage).toMatch(/^url\("data:image\/svg\+xml,/);
  });

  it("renders without live glow or scratch layer before the first lesson of the day", async () => {
    await renderGlance(8 * 60 + 15);
    expect(screen.queryByTestId("glance-glow")).toBeNull();
    expect(screen.queryByTestId("glance-scratch-layer")).toBeNull();
  });

  it("uses the deep subject field, matching gradient glow, and scratches in the next lesson with progress", async () => {
    await renderGlance(8 * 60 + 55, {
      subjectColorOverrides: { s1: "amber", s2: "pink" },
    });

    const card = screen.getByTestId("day-glance");
    expect(card.className).toContain("u-tone-field-deep");
    expect(card.style.getPropertyValue("--tone")).toBe("var(--accent-amber)");
    expect(card.style.getPropertyValue("--next-tone")).toBe("var(--accent-pink)");

    const glow = screen.getByTestId("glance-glow");
    expect(glow.style.getPropertyValue("--tone")).toBe("var(--accent-amber)");
    const glowNext = screen.getByTestId("glance-glow-next");
    expect(glowNext.style.getPropertyValue("--next-tone")).toBe("var(--accent-pink)");
    expect(Number(glowNext.style.getPropertyValue("--scratch"))).toBeGreaterThan(0.5);

    const scratchLayer = screen.getByTestId("glance-scratch-layer");
    expect(scratchLayer.className).toContain("u-tone-field-deep");
    expect(scratchLayer.style.getPropertyValue("--tone")).toBe("var(--accent-pink)");
    expect(scratchLayer.style.maskImage).toMatch(/^url\("data:image\/svg\+xml,/);
  });

  it("omits the scratch layer at progress 0 and on the last lesson of the day", async () => {
    await renderGlance(8 * 60 + 30, {
      subjectColorOverrides: { s1: "mint", s2: "lilac" },
    });
    expect(screen.queryByTestId("glance-scratch-layer")).toBeNull();
    expect(screen.queryByTestId("glance-glow-next")).toBeNull();
  });

  it("omits the scratch layer on the final lesson when there is no following lesson", async () => {
    await renderGlance(9 * 60 + 45, {
      subjectColorOverrides: { s2: "#162040" },
    });
    const card = screen.getByTestId("day-glance");
    expect(card.hasAttribute("data-tone-dark")).toBe(true);
    expect(card.style.getPropertyValue("--tone")).toBe("#162040");
    expect(screen.queryByTestId("glance-scratch-layer")).toBeNull();
    expect(screen.queryByTestId("glance-glow-next")).toBeNull();
  });
});
