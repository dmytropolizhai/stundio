/**
 * The "Customization" sheet opened from Settings — bounded appearance settings (lesson card
 * style, corner radius, depth, reduced motion) plus per-subject accent overrides. Same rule as
 * everywhere else: a real store over the `data/` fixtures, no network.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { SettingsView } from "../screens/SettingsView.tsx";
import { subjectToneKey } from "@/ui/theme";
import { useSubjects } from "../hooks/useSubjects.ts";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

const wrapper = (harness: Harness) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <StoreContext.Provider value={harness.store}>{children}</StoreContext.Provider>;
  };

const openSheet = async (harness: Harness): Promise<void> => {
  wrap(harness, <SettingsView onPickClass={() => {}} onShowWhatsNew={() => {}}/> );
  await clickAndSettle(() => {
    fireEvent.click(screen.getByText("Pielāgot lietotnes izskatu"));
  });
};

describe("CustomizationSheet", () => {
  it("persists the lesson card style", async () => {
    const harness = await openSheetHarness();
    expect(harness.store.getState().settings.lessonCardStyle).toBe("outline");

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Aizpildīta"));
    });
    expect(harness.store.getState().settings.lessonCardStyle).toBe("filled");
  });

  it("persists the corner radius, stepping through the slider", async () => {
    const harness = await openSheetHarness();
    expect(harness.store.getState().settings.cardRadius).toBe("xl");

    const slider = screen.getByRole("slider", { name: "Stūru noapaļojums" });
    await clickAndSettle(() => {
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    });
    expect(harness.store.getState().settings.cardRadius).toBe("2xl");

    await clickAndSettle(() => {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    });
    await clickAndSettle(() => {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    });
    expect(harness.store.getState().settings.cardRadius).toBe("lg");
  });

  it("persists the card depth", async () => {
    const harness = await openSheetHarness();
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Izteikts"));
    });
    expect(harness.store.getState().settings.cardElevation).toBe("bold");
  });

  it("persists reduced motion", async () => {
    const harness = await openSheetHarness();
    expect(harness.store.getState().settings.reduceMotion).toBe(false);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Mazāk animāciju" }));
    });
    expect(harness.store.getState().settings.reduceMotion).toBe(true);
  });

  it("reassigns a subject's colour to one of the six fixed tones, and resets it back", async () => {
    const harness = await openSheetHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });
    const first = result.current.subjects[0];
    if (first === undefined) throw new Error("fixture class has no subjects");

    const label = first.subject.name || first.subject.short;
    const key = subjectToneKey(first.subject);
    const row = within(screen.getByText(label).closest("div") as HTMLElement);

    // Pick whichever tone isn't already active, so the click is guaranteed to change something.
    const currentlyPressed = row
      .getAllByRole("button", { pressed: false })
      .find((button) => button.getAttribute("aria-label") !== null);
    if (currentlyPressed === undefined) throw new Error("no selectable tone button found");

    await clickAndSettle(() => {
      fireEvent.click(currentlyPressed);
    });
    const chosen = currentlyPressed.getAttribute("aria-label");
    expect(harness.store.getState().settings.subjectColorOverrides[key]).toBe(chosen);

    await clickAndSettle(() => {
      fireEvent.click(row.getByText("Auto"));
    });
    expect(harness.store.getState().settings.subjectColorOverrides[key]).toBeUndefined();
  });

  it("resets every customization setting back to its default", async () => {
    const harness = await openSheetHarness();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Aizpildīta"));
    });
    const slider = screen.getByRole("slider", { name: "Stūru noapaļojums" });
    await clickAndSettle(() => {
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Izteikts"));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Mazāk animāciju" }));
    });
    const settings = harness.store.getState().settings;
    expect(settings.lessonCardStyle).toBe("filled");
    expect(settings.cardRadius).toBe("2xl");
    expect(settings.cardElevation).toBe("bold");
    expect(settings.reduceMotion).toBe(true);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Atjaunot noklusējumu"));
    });
    const reset = harness.store.getState().settings;
    expect(reset.lessonCardStyle).toBe("outline");
    expect(reset.cardRadius).toBe("xl");
    expect(reset.cardElevation).toBe("soft");
    expect(reset.reduceMotion).toBe(false);
    expect(reset.subjectColorOverrides).toEqual({});
  });

  it("says so when no class is selected", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    await openSheet(harness);
    expect(screen.getByText("Izvēlies klasi, lai pielāgotu priekšmetu krāsas.")).toBeDefined();
  });
});

const openSheetHarness = async (): Promise<Harness> => {
  const harness = await bootHarness();
  await openSheet(harness);
  return harness;
};
