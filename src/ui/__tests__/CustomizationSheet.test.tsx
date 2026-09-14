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
  wrap(harness, <SettingsView onPickClass={() => {}} onShowWhatsNew={() => {}} />);
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

  it("sets the app-wide accent to one of the six fixed tones, and resets it to default", async () => {
    const harness = await openSheetHarness();
    expect(harness.store.getState().settings.appAccent).toBe("default");

    const row = within(
      screen
        .getByText("Krāsa izceltiem elementiem — šodienas datumam, izvēlētajām opcijām.")
        .closest("div") as HTMLElement,
    );
    const swatch = row.getByRole("button", { name: "lilac" });

    await clickAndSettle(() => {
      fireEvent.click(swatch);
    });
    expect(harness.store.getState().settings.appAccent).toBe("lilac");

    await clickAndSettle(() => {
      fireEvent.click(row.getByText("Noklusējuma"));
    });
    expect(harness.store.getState().settings.appAccent).toBe("default");
  });

  it("hides the per-subject list while colour-coding is off, without dropping the overrides", async () => {
    const harness = await openSheetHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });
    const first = result.current.subjects[0];
    if (first === undefined) throw new Error("fixture class has no subjects");
    const label = first.subject.name || first.subject.short;
    const key = subjectToneKey(first.subject);

    await clickAndSettle(() => {
      fireEvent.click(
        within(screen.getByText(label).closest("div") as HTMLElement).getByRole("button", {
          name: "lime",
        }),
      );
    });
    expect(harness.store.getState().settings.subjectColorOverrides[key]).toBe("lime");
    expect(screen.getByText(label)).toBeDefined();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Priekšmetu krāsu kodēšana" }));
    });
    expect(harness.store.getState().settings.subjectColorCodingEnabled).toBe(false);
    // The picker is hidden, not just disabled — nothing about it is left on screen.
    expect(screen.queryByText(label)).toBeNull();
    // The override itself survives underneath, ready to apply again once switched back on.
    expect(harness.store.getState().settings.subjectColorOverrides[key]).toBe("lime");

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Priekšmetu krāsu kodēšana" }));
    });
    expect(screen.getByText(label)).toBeDefined();
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
    await clickAndSettle(() => {
      fireEvent.click(
        within(
          screen
            .getByText("Krāsa izceltiem elementiem — šodienas datumam, izvēlētajām opcijām.")
            .closest("div") as HTMLElement,
        ).getByRole("button", { name: "pink" }),
      );
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("switch", { name: "Priekšmetu krāsu kodēšana" }));
    });
    const settings = harness.store.getState().settings;
    expect(settings.lessonCardStyle).toBe("filled");
    expect(settings.cardRadius).toBe("2xl");
    expect(settings.cardElevation).toBe("bold");
    expect(settings.reduceMotion).toBe(true);
    expect(settings.appAccent).toBe("pink");
    expect(settings.subjectColorCodingEnabled).toBe(false);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Atjaunot noklusējumu"));
    });
    const reset = harness.store.getState().settings;
    expect(reset.lessonCardStyle).toBe("outline");
    expect(reset.cardRadius).toBe("xl");
    expect(reset.cardElevation).toBe("soft");
    expect(reset.reduceMotion).toBe(false);
    expect(reset.subjectColorOverrides).toEqual({});
    expect(reset.appAccent).toBe("default");
    expect(reset.subjectColorCodingEnabled).toBe(true);
  });

  it("assigns a subject a free custom colour and reads it back through the DS render path", async () => {
    const harness = await openSheetHarness();
    const { result } = renderHook(() => useSubjects(), { wrapper: wrapper(harness) });
    const first = result.current.subjects[0];
    if (first === undefined) throw new Error("fixture class has no subjects");

    const label = first.subject.name || first.subject.short;
    const key = subjectToneKey(first.subject);
    const row = within(screen.getByText(label).closest("div") as HTMLElement);

    await clickAndSettle(() => {
      fireEvent.click(row.getByRole("button", { name: "Pielāgota krāsa" }));
    });
    const stored = harness.store.getState().settings.subjectColorOverrides[key];
    expect(stored).toMatch(/^#[0-9a-f]{6}$/i);
    // The wheel opens right away for a freshly-picked custom colour.
    expect(screen.getByRole("slider", { name: "Pielāgota krāsa" })).toBeDefined();

    await clickAndSettle(() => {
      fireEvent.click(row.getByText("Auto"));
    });
    expect(harness.store.getState().settings.subjectColorOverrides[key]).toBeUndefined();
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
