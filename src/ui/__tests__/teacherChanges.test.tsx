import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreContext } from "@/store";
import { listTeachers } from "@/lib/edupage";
import { ChangesView } from "../screens/changes-view";
import { ChangesLessonCard } from "../screens/changes-view/changes-lesson-card.tsx";
import { ChangesAbsentTeachers } from "../screens/changes-view/changes-absent-teachers.tsx";
import { bootHarness, classIdOf, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("Teacher Changes View (T7)", () => {
  it("displays 'Manas izmaiņas' tab label in teacher persona", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    const teacher = teachers[0]!;

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(teacher.id);
    });

    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    expect(screen.getByText("Manas izmaiņas")).toBeDefined();
    expect(screen.getByText("Visa skola")).toBeDefined();
  });

  it("renders absent colleagues banner when absent teachers exist on the day", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(teachers[0]!.id);
    });

    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const absentBanner = screen.getByTestId("absent-teachers");
    expect(absentBanner).toBeDefined();
    expect(absentBanner.textContent).toContain("Šodien prombūtnē");
    // From real fixture 2026-09-09: Egija Baumane, Liene Elizabete Čakste, Olga Sabanska, Valda Salmiņa
    expect(absentBanner.textContent).toContain("Egija Baumane");
  });

  it("ChangesAbsentTeachers does not render when teacher list is empty", async () => {
    const harness = await bootHarness();
    const { container } = wrap(harness, <ChangesAbsentTeachers teachers={[]} />);
    expect(container.querySelector("[data-testid='absent-teachers']")).toBeNull();
  });

  it("ChangesLessonCard displays class and cover badge for teacher cover lesson", async () => {
    const harness = await bootHarness();
    const mockCoverLesson = {
      period: "4",
      start: "11:00",
      end: "11:40",
      span: 1,
      subject: { id: "math", name: "Matemātika", short: "Mat" },
      teachers: [],
      rooms: [{ id: "r1", name: "204", short: "204" }],
      classes: [{ id: "c1", name: "S3-1", short: "S3-1" }],
      group: null,
      status: "substituted" as const,
      role: "cover" as const,
      coverFor: { id: "t5", name: "Ozoliņa Laura", short: "L. Ozoliņa" },
      isCover: true,
      changeNote: "Aizvieto Ozoliņa Laura",
      original: null,
    };

    wrap(harness, <ChangesLessonCard lesson={mockCoverLesson} onOpen={vi.fn()} />);

    expect(screen.getByText("S3-1")).toBeDefined();
    expect(screen.getByText("Aizvieto: Ozoliņa Laura")).toBeDefined();
    expect(screen.getByText("204")).toBeDefined();
  });

  it("switches between 'Manas izmaiņas' and 'Visa skola' tabs", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(teachers[0]!.id);
    });

    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const allTab = screen.getByRole("radio", { name: "Visa skola" });
    await clickAndSettle(() => {
      fireEvent.click(allTab);
    });

    // Search input should now be visible on all classes tab
    expect(screen.getByPlaceholderText("Meklēt grupu, priekšmetu vai skolotāju…")).toBeDefined();
  });

  it("ChangesAbsentTeachers collapses when text > 150 chars and expands on click", async () => {
    const harness = await bootHarness();
    const longTeacherList = [
      "Egija Baumane",
      "Liene Elizabete Čakste",
      "Olga Sabanska",
      "Valda Salmiņa",
      "Jānis Bērziņš",
      "Aivars Ozols",
      "Kristaps Kalniņš",
      "Māra Liepiņa",
      "Dace Vītola",
      "Andris Bērziņš",
      "Ilze Kalniņa",
    ];
    expect(longTeacherList.join(", ").length).toBeGreaterThan(150);

    wrap(harness, <ChangesAbsentTeachers teachers={longTeacherList} />);
    const trigger = screen.getByRole("button", { name: /Šodien prombūtnē/i });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(longTeacherList.join(", "))).toBeNull();

    await clickAndSettle(() => {
      fireEvent.click(trigger);
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(longTeacherList.join(", "))).toBeDefined();
  });

  it("does not tag any class as 'Mana grupa' in 'Visa skola' tab when in teacher persona", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    const studentClassId = classIdOf(harness.store, "DT3-2");

    await clickAndSettle(() => {
      void harness.store.getState().setClass(studentClassId);
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(teachers[0]!.id);
    });

    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const allTab = screen.getByRole("radio", { name: "Visa skola" });
    await clickAndSettle(() => {
      fireEvent.click(allTab);
    });

    expect(screen.queryByText(/Mana grupa/)).toBeNull();
  });

  it("shows empty state when teacher has no identity selected", async () => {
    const harness = await bootHarness();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(null);
    });

    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    expect(screen.getByText("Nav atrasts neviens skolotājs")).toBeDefined();
  });
});
