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
  it("lists cached teachers in A–Z slabs and filters with diacritic-tolerant search", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    // In regulartt_1175.json there are 116 teaching staff
    expect(screen.getAllByRole("button").length).toBeGreaterThan(50);

    const search = screen.getByLabelText("Meklēt skolotāju…");
    fireEvent.change(search, {
      target: { value: "Alksne" },
    });

    expect(screen.getByText("Alksne Santa")).toBeDefined();
    expect(screen.queryByText("Geislers Edgars")).toBeNull();

    // Clear search button restores the full list
    fireEvent.click(screen.getByLabelText("Notīrīt meklēšanu"));
    expect(screen.getByText("Geislers Edgars")).toBeDefined();

    // Diacritic-folded and reversed word-order search matches Latvian surnames
    fireEvent.change(search, {
      target: { value: "nora argale" },
    });
    expect(screen.getByText("Ārgale Nora")).toBeDefined();
  });

  it("shows empty state when no teachers match query", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "NonExistentTeacherName123" },
    });

    expect(screen.getByText("Nav atrasts neviens skolotājs")).toBeDefined();
  });

  it("filters by form teachers and resets with All pill", async () => {
    const harness = await bootHarness();
    wrap(harness, <TeacherPicker />);

    const formFilter = screen.getByRole("button", { name: "Klases audzinātājs" });
    fireEvent.click(formFilter);

    // Alksne Santa is a form teacher (audzinātāja); Geislers Edgars is not
    expect(screen.getByText("Alksne Santa")).toBeDefined();
    expect(screen.queryByText("Geislers Edgars")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Visi" }));
    expect(screen.getByText("Geislers Edgars")).toBeDefined();
  });

  it("draft-selects a teacher, then commits persona, teacher id, and onPicked on Continue", async () => {
    const harness = await bootHarness();
    const onPicked = vi.fn();
    wrap(harness, <TeacherPicker onPicked={onPicked} />);

    const continueBefore = screen.getByRole("button", { name: "Turpināt" });
    expect((continueBefore as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Meklēt skolotāju…"), {
      target: { value: "Geislers" },
    });

    fireEvent.click(screen.getByText("Geislers Edgars"));

    // Selecting a tile drafts it without committing until Continue is pressed
    expect(onPicked).not.toHaveBeenCalled();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Turpināt · Geislers Edgars" }));
    });

    expect(onPicked).toHaveBeenCalledTimes(1);
    const settings = harness.store.getState().settings;
    expect(settings.persona).toBe("teacher");
    expect(settings.selectedTeacherId).toBe("-23");
  });

  it("renders switch mode header with back button and invokes onBack", async () => {
    const harness = await bootHarness();
    const onBack = vi.fn();
    wrap(harness, <TeacherPicker mode="switch" onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Atpakaļ" }));
    expect(onBack).toHaveBeenCalledTimes(1);
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

    // Each half is picked through the control that covers it, not through its heading: the
    // heading is a label inside the panel, and the single tab stop per half is the overlay
    // button carrying the role's name.
    fireEvent.click(screen.getByRole("button", { name: /Skolotājs/ }));
    expect(onSelect).toHaveBeenCalledWith("teacher");

    fireEvent.click(screen.getByRole("button", { name: /Skolēns/ }));
    expect(onSelect).toHaveBeenCalledWith("student");
  });
});

describe("IdentitySheet", () => {
  it("renders both student and teacher cards simultaneously with live context", async () => {
    const harness = await bootHarness();
    // Remember a teacher (Alksne Santa, form teacher) alongside the default student class
    await harness.store.getState().setTeacher("-17");
    await harness.store.getState().updateSettings({ persona: "student", subgroup: "1" });

    wrap(
      harness,
      <IdentitySheet open={true} onClose={vi.fn()} onPickClass={vi.fn()} onPickTeacher={vi.fn()} />,
    );

    expect(screen.getByText("Izvēlies lomu")).toBeDefined();

    const studentCard = screen.getByTestId("identity-role-card-student");
    const teacherCard = screen.getByTestId("identity-role-card-teacher");
    expect(studentCard.getAttribute("data-selected")).toBe("true");
    expect(teacherCard.getAttribute("data-selected")).toBe("false");

    // Both saved identities and their metadata are visible at once
    expect(screen.getByText("Skolēns")).toBeDefined();
    expect(screen.getByText("Skolotājs")).toBeDefined();
    expect(screen.getByText("Pusgrupa 1")).toBeDefined();
    expect(screen.getByTestId("identity-role-today-student")).toBeDefined();
    expect(screen.getByTestId("identity-role-today-teacher")).toBeDefined();
  });

  it("stages role switches inside the sheet and only commits on confirm", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    const onPickTeacher = vi.fn();
    const onClose = vi.fn();

    wrap(
      harness,
      <IdentitySheet
        open={true}
        onClose={onClose}
        onPickClass={onPickClass}
        onPickTeacher={onPickTeacher}
      />,
    );

    // Selecting teacher stages it without mutating the store yet
    fireEvent.click(screen.getByRole("radio", { name: /Skolotājs/ }));
    expect(screen.getByTestId("identity-role-card-teacher").getAttribute("data-selected")).toBe(
      "true",
    );
    expect(harness.store.getState().settings.persona).toBe("student");

    // Confirming commits teacher persona and opens teacher picker because no teacher is picked yet
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Apstiprināt" }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(onPickTeacher).toHaveBeenCalled();
    expect(harness.store.getState().settings.persona).toBe("teacher");
  });

  it("routes inline Change buttons directly to each role's picker", async () => {
    const harness = await bootHarness();
    const onPickClass = vi.fn();
    const onPickTeacher = vi.fn();
    const onClose = vi.fn();

    wrap(
      harness,
      <IdentitySheet
        open={true}
        onClose={onClose}
        onPickClass={onPickClass}
        onPickTeacher={onPickTeacher}
      />,
    );

    // Active student card's Change button
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mainīt" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPickClass).toHaveBeenCalledTimes(1);

    // Inactive teacher card's Change button switches persona and opens teacher picker
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mainīt · Skolotājs" }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onPickTeacher).toHaveBeenCalledTimes(1);
    expect(harness.store.getState().settings.persona).toBe("teacher");
  });

  it("supports keyboard arrow navigation between role cards", async () => {
    const harness = await bootHarness();
    wrap(
      harness,
      <IdentitySheet open={true} onClose={vi.fn()} onPickClass={vi.fn()} onPickTeacher={vi.fn()} />,
    );

    const studentRadio = screen.getByRole("radio", { name: /Skolēns/ });
    await clickAndSettle(() => {
      fireEvent.keyDown(studentRadio, { key: "ArrowDown" });
    });
    expect(screen.getByTestId("identity-role-card-teacher").getAttribute("data-selected")).toBe(
      "true",
    );
  });
});
