/**
 * The subjects screen and the catalogue it is derived from.
 *
 * This screen came in with the design system and has no pre-DS counterpart, so these are the
 * only tests that cover `useSubjects`. Same rule as everywhere else: a real store over the
 * `data/` fixtures, no network.
 */
import { describe, expect, it } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { SubjectsView } from "../screens/SubjectsView.tsx";
import { useSubjects } from "../hooks/useSubjects.ts";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

const wrapper = (harness: Harness) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>;
  };

describe("useSubjects", () => {
  it("counts each subject's lessons per week for the selected class", async () => {
    const harness = await bootHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });

    expect(result.current.subjects.length).toBeGreaterThan(0);
    for (const entry of result.current.subjects) expect(entry.count).toBeGreaterThan(0);

    // Busiest first — the timetable is mostly about its heaviest subject.
    const counts = result.current.subjects.map((s) => s.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it("never counts a lesson belonging to another class", async () => {
    const harness = await bootHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });

    const timetable = Object.values(harness.store.getState().timetables)[0];
    const classId = harness.store.getState().settings.selectedClassId;
    const mine = timetable?.lessons.filter((l) => l.classIds.includes(classId ?? "")).length ?? 0;

    const total = result.current.subjects.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(mine);
  });

  it("cross-references teachers back to the subjects they take", async () => {
    const harness = await bootHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });

    for (const entry of result.current.teachers) {
      expect(entry.subjects.length).toBeGreaterThan(0);
    }
  });

  it("is empty until a class is chosen", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });

    expect(result.current.subjects).toEqual([]);
    expect(result.current.teachers).toEqual([]);
  });
});

describe("SubjectsView", () => {
  it("lists the class's subjects with how often they meet", async () => {
    const harness = await bootHarness();
    wrap(harness, <SubjectsView />);

    const cards = screen.getAllByTestId(/^subject-/);
    expect(cards.length).toBeGreaterThan(0);
    // "{n}× nedēļā" — the count is the headline number on each tile.
    expect(screen.getAllByText(/×\s*nedēļā/).length).toBe(cards.length);
  });

  it("prints subject names verbatim, diacritics intact", async () => {
    const harness = await bootHarness();
    wrap(harness, <SubjectsView />);

    const timetable = Object.values(harness.store.getState().timetables)[0];
    const classId = harness.store.getState().settings.selectedClassId ?? "";
    const first = timetable?.lessons.find((l) => l.classIds.includes(classId));
    const subject = timetable?.subjects.find((s) => s.id === first?.subjectId);

    expect(subject).toBeDefined();
    const shown = subject?.name === "" ? subject.short : (subject?.name ?? "");
    expect(screen.getAllByText(shown).length).toBeGreaterThan(0);
  });

  it("colours subject tiles with more than one tone by default", async () => {
    const harness = await bootHarness();
    wrap(harness, <SubjectsView />);

    const tones = new Set(
      screen
        .getAllByTestId(/^subject-/)
        .flatMap((card) => card.className.split(" "))
        .filter((cls) =>
          ["bg-amber", "bg-sky", "bg-lilac", "bg-pink", "bg-mint", "bg-lime"].includes(cls),
        ),
    );
    expect(tones.size).toBeGreaterThan(1);
  });

  it("falls every subject tile back to one neutral tone with colour-coding off", async () => {
    const harness = await bootHarness({ subjectColorCodingEnabled: false });
    wrap(harness, <SubjectsView />);

    const cards = screen.getAllByTestId(/^subject-/);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.className.split(" ")).toContain("bg-sky");
    }
  });

  it("asks for a class instead of rendering an empty grid", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    wrap(harness, <SubjectsView />);

    expect(screen.getByText("Vispirms izvēlies klasi")).toBeDefined();
  });

  it("names the teachers behind the subjects", async () => {
    const harness = await bootHarness();
    wrap(harness, <SubjectsView />);

    expect(screen.getByText("Skolotāji")).toBeDefined();
  });
});
