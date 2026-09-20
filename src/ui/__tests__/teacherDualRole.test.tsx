import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreContext } from "@/store";
import { listTeachers } from "@/lib/edupage";
import { DayTopBar } from "../screens/day-view/day-top-bar.tsx";
import { WeekTopBar } from "../screens/week-view/week-top-bar.tsx";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("Teacher Dual Role (T8)", () => {
  it("shows 'Manas stundas | Mana klase' segmented control when teacher is a form teacher", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    // Find a teacher who is a form teacher (audzinātājs)
    const formTeacher = teachers.find((t) => t.formClassIds.length > 0);
    expect(formTeacher).toBeDefined();

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(formTeacher!.id);
    });

    wrap(
      harness,
      <DayTopBar
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={true}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    const segment = screen.getByTestId("form-teacher-segment");
    expect(segment).toBeDefined();
    expect(screen.getByRole("radio", { name: "Manas stundas" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Mana klase" })).toBeDefined();
  });

  it("does not show segmented control when teacher is NOT a form teacher", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    // Find a teacher who is NOT a form teacher
    const nonFormTeacher = teachers.find((t) => t.formClassIds.length === 0);
    expect(nonFormTeacher).toBeDefined();

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(nonFormTeacher!.id);
    });

    wrap(
      harness,
      <DayTopBar
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={true}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("form-teacher-segment")).toBeNull();
  });

  it("does not show segmented control for student persona", async () => {
    const harness = await bootHarness();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("student");
    });

    wrap(
      harness,
      <DayTopBar
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={true}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("form-teacher-segment")).toBeNull();
  });

  it("switches teacherView between own and form-class", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    const formTeacher = teachers.find((t) => t.formClassIds.length > 0)!;

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(formTeacher.id);
    });

    expect(harness.store.getState().settings.teacherView).toBe("own");

    wrap(
      harness,
      <DayTopBar
        date={FIXTURE_DATE}
        today={FIXTURE_DATE}
        isToday={true}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    const formClassRadio = screen.getByRole("radio", { name: "Mana klase" });
    await clickAndSettle(() => {
      fireEvent.click(formClassRadio);
    });

    expect(harness.store.getState().settings.teacherView).toBe("form-class");

    const ownRadio = screen.getByRole("radio", { name: "Manas stundas" });
    await clickAndSettle(() => {
      fireEvent.click(ownRadio);
    });

    expect(harness.store.getState().settings.teacherView).toBe("own");
  });

  it("WeekTopBar also shows segmented control for form teachers", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    const formTeacher = teachers.find((t) => t.formClassIds.length > 0)!;

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(formTeacher.id);
    });

    wrap(
      harness,
      <WeekTopBar
        date={FIXTURE_DATE}
        firstDay={FIXTURE_DATE}
        lastDay={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onPickClass={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByTestId("form-teacher-segment")).toBeDefined();
  });
});
