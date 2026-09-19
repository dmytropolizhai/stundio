import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { ChangesView } from "../screens/ChangesView.tsx";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("ChangesView", () => {
  it("renders changed lessons for the selected class on fixture date", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    // Filter tabs are shown
    expect(screen.getByRole("radio", { name: "Mana grupa" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Visa skola" })).toBeDefined();

    // A1-2 has changed lessons on 2026-09-09
    const changes = screen.getAllByTestId(/^change-lesson-/);
    expect(changes.length).toBeGreaterThan(0);
  });

  it("opens lesson sheet when a changed lesson card is clicked", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const firstChange = screen.getAllByTestId(/^change-lesson-/)[0]!;
    fireEvent.click(firstChange);

    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("switches to Visa skola and displays all school substitutions", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const allTab = screen.getByRole("radio", { name: "Visa skola" });
    await clickAndSettle(() => {
      fireEvent.click(allTab);
    });

    // Search input should appear
    expect(screen.getByPlaceholderText("Meklēt grupu, priekšmetu vai skolotāju…")).toBeDefined();

    // Multiple groups should be listed
    expect(screen.getAllByText(/A1-2/).length).toBeGreaterThan(0);
  });

  it("filters all school substitutions by search query", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const allTab = screen.getByRole("radio", { name: "Visa skola" });
    await clickAndSettle(() => {
      fireEvent.click(allTab);
    });

    const input = screen.getByPlaceholderText("Meklēt grupu, priekšmetu vai skolotāju…");
    fireEvent.change(input, { target: { value: "Matemātika" } });

    // Should find matching subject
    expect(screen.getAllByText(/Matemātika/).length).toBeGreaterThan(0);

    // Search for non-existent item
    fireEvent.change(input, { target: { value: "xyznonexistent123" } });
    expect(screen.getByText("Nekas netika atrasts")).toBeDefined();
  });

  it("handles day navigation with chevrons", async () => {
    const harness = await bootHarness();
    const onDateChange = vi.fn();
    wrap(
      harness,
      <ChangesView date={FIXTURE_DATE} onDateChange={onDateChange} onPickClass={vi.fn()} />,
    );

    fireEvent.click(screen.getByLabelText("Iepriekšējā diena"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");

    fireEvent.click(screen.getByLabelText("Nākamā diena"));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("shows empty state when no class is selected", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    const onPickClass = vi.fn();
    wrap(
      harness,
      <ChangesView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={onPickClass} />,
    );

    expect(screen.getByText("Vispirms izvēlies klasi")).toBeDefined();
    fireEvent.click(screen.getByText("Mainīt"));
    expect(onPickClass).toHaveBeenCalled();
  });

  it("shows empty state on dates with no changes for the class", async () => {
    const harness = await bootHarness();
    wrap(harness, <ChangesView date="2026-09-01" onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    expect(screen.getByText("Izmaiņu nav")).toBeDefined();
  });
});
