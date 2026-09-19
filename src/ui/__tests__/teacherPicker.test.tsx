import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { TeacherPicker } from "../screens/teacher-picker";
import { OnboardingPersona } from "../screens/onboarding-persona";
import { IdentitySheet } from "../screens/sheets/IdentitySheet.tsx";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("TeacherPicker", () => {
  it("lists cached teachers and filters as the user types", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    // In regulartt_1175.json there are 116 teaching staff
    expect(screen.getAllByRole("button").length).toBeGreaterThan(50);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "Alksne" },
    });

    expect(screen.getByText("Alksne Santa")).toBeDefined();
    expect(screen.queryByText("Geislers Edgars")).toBeNull();
  });

  it("shows empty state when no teachers match query", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "NonExistentTeacherName123" },
    });

    expect(screen.getByText("Nav atrasts neviens skolotājs")).toBeDefined();
  });

  it("marks form teachers with a badge", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "Alksne" },
    });

    // Alksne Santa is a form teacher (audzinātāja)
    expect(screen.getByText("Klases audzinātājs")).toBeDefined();
  });

  it("selects a teacher, sets persona to teacher, and fires onPicked", async () => {
    const harness = await bootHarness();
    const onPicked = vi.fn();
    wrap(harness, <TeacherPicker onPicked={onPicked} />);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "Geislers" },
    });

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Geislers Edgars"));
    });

    expect(onPicked).toHaveBeenCalled();
    const settings = harness.store.getState().settings;
    expect(settings.persona).toBe("teacher");
    expect(settings.selectedTeacherId).toBe("-23");
  });
});

describe("OnboardingPersona", () => {
  it("renders student and teacher options and calls onSelectPersona", async () => {
    const harness = await bootHarness();
    const onSelect = vi.fn();
    wrap(harness, <OnboardingPersona onSelectPersona={onSelect} />);

    expect(screen.getByText("Izvēlies savu pusi")).toBeDefined();
    expect(screen.getByText("Skolēns")).toBeDefined();
    expect(screen.getByText("Skolotājs")).toBeDefined();

    fireEvent.click(screen.getByText("Skolotājs"));
    expect(onSelect).toHaveBeenCalledWith("teacher");

    fireEvent.click(screen.getByText("Skolēns"));
    expect(onSelect).toHaveBeenCalledWith("student");
  });
});

describe("IdentitySheet", () => {
  it("allows switching persona and triggering pickers", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    const onPickTeacher = vi.fn();
    const onClose = vi.fn();

    const { rerender } = wrap(
      harness,
      <IdentitySheet
        open={true}
        onClose={onClose}
        onPickClass={onPickClass}
        onPickTeacher={onPickTeacher}
      />,
    );

    expect(screen.getByText("Izvēlies lomu")).toBeDefined();

    // Default persona is student
    expect(screen.getByText("Mana grupa")).toBeDefined();
    fireEvent.click(screen.getByText("Mainīt"));
    expect(onClose).toHaveBeenCalled();
    expect(onPickClass).toHaveBeenCalled();

    // Switch to teacher
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Skolotājs"));
    });
    expect(harness.store.getState().settings.persona).toBe("teacher");

    rerender(
      <StoreContext.Provider value={harness.store}>
        <IdentitySheet
          open={true}
          onClose={onClose}
          onPickClass={onPickClass}
          onPickTeacher={onPickTeacher}
        />
      </StoreContext.Provider>,
    );

    expect(screen.getByText("Izvēlies skolotāju")).toBeDefined();
    fireEvent.click(screen.getByText("Mainīt"));
    expect(onPickTeacher).toHaveBeenCalled();
  });
});
