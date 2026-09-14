import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { OnboardingCustomization } from "../screens/OnboardingCustomization.tsx";
import { SettingsView } from "../screens/SettingsView.tsx";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

vi.mock(import("@/notifications"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ensureNotificationPermission: vi.fn().mockResolvedValue(true),
    isNotificationPermissionDenied: vi.fn().mockResolvedValue(false),
    openNotificationSettings: vi.fn(),
  };
});

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("OnboardingCustomization", () => {
  it("navigates through all 4 steps and completes on finish", async () => {
    const harness = await bootHarness();
    const onDone = vi.fn();
    const onBack = vi.fn();

    wrap(harness, <OnboardingCustomization onDone={onDone} onBack={onBack} />);

    // Step 1: Appearance & Theme
    expect(screen.getByText("Izskats un tēma")).toBeDefined();
    expect(screen.getByText("Pielāgo lietotnes stilu")).toBeDefined();

    // Advance to Step 2
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Step 2: Lesson Cards
    expect(screen.getByText("Stundu kartītes")).toBeDefined();
    expect(screen.getByText("Stundu izskats pēc tavas gaumes")).toBeDefined();

    // Advance to Step 3
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Step 3: Schedule View
    expect(screen.getByText("Saraksta pārskatāmība")).toBeDefined();
    expect(screen.getByText("Rādi to, kas tev svarīgs")).toBeDefined();

    // Advance to Step 4
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Step 4: Smart Notifications & Special Features
    expect(screen.getByText("Īpašās funkcijas")).toBeDefined();
    expect(screen.getByText("Viedie paziņojumi un iespējas")).toBeDefined();
    expect(screen.getByText("100% bezsaistes režīms")).toBeDefined();
    expect(screen.getByText("Sākuma ekrāna logrīks")).toBeDefined();
    expect(screen.getByText("Kopīgo ar klasesbiedriem")).toBeDefined();

    // Advance to Step 5: Direct messaging to developer in Settings
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    expect(screen.getByText("Saziņa ar izstrādātāju")).toBeDefined();
    expect(screen.getByText("Atsauksmes un ieteikumi")).toBeDefined();
    expect(screen.getByText("Pamanīji kļūdu?")).toBeDefined();
    expect(screen.getByText("Ir ideja jaunai funkcijai?")).toBeDefined();
    expect(
      screen.getByText("Pieejams jebkurā laikā cilnē „Iestatījumi” ekrāna apakšā."),
    ).toBeDefined();

    // Finish onboarding
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Izvēlies savu klasi" }));
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("allows skipping directly to class selection from any step", async () => {
    const harness = await bootHarness();
    const onDone = vi.fn();

    wrap(harness, <OnboardingCustomization onDone={onDone} />);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Izlaist" }));
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("handles back navigation between steps and to the parent on step 0", async () => {
    const harness = await bootHarness();
    const onDone = vi.fn();
    const onBack = vi.fn();

    wrap(harness, <OnboardingCustomization onDone={onDone} onBack={onBack} />);

    // Step 0 -> Back calls onBack
    await clickAndSettle(() => {
      fireEvent.click(screen.getByLabelText("Atpakaļ"));
    });
    expect(onBack).toHaveBeenCalledTimes(1);

    // Step 0 -> Step 1 -> Back returns to Step 0
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    expect(screen.getByText("Stundu kartītes")).toBeDefined();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByLabelText("Atpakaļ"));
    });
    expect(screen.getByText("Izskats un tēma")).toBeDefined();
  });

  it("customizes theme and app accent", async () => {
    const harness = await bootHarness();
    wrap(harness, <OnboardingCustomization onDone={vi.fn()} />);

    // Change theme
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Tumšs"));
    });
    expect(harness.store.getState().settings.theme).toBe("dark");

    // Change accent
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "mint" }));
    });
    expect(harness.store.getState().settings.appAccent).toBe("mint");

    // Reset accent
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Noklusējuma"));
    });
    expect(harness.store.getState().settings.appAccent).toBe("default");
  });

  it("customizes card style, radius, and elevation on step 2", async () => {
    const harness = await bootHarness();
    wrap(harness, <OnboardingCustomization onDone={vi.fn()} />);

    // Go to step 2
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Style
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Aizpildīta"));
    });
    expect(harness.store.getState().settings.lessonCardStyle).toBe("filled");

    // Radius
    const slider = screen.getByRole("slider", { name: "Stūru noapaļojums" });
    await clickAndSettle(() => {
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    });
    expect(harness.store.getState().settings.cardRadius).toBe("2xl");

    // Elevation
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Izteikts"));
    });
    expect(harness.store.getState().settings.cardElevation).toBe("bold");
  });

  it("customizes schedule toggles on step 3", async () => {
    const harness = await bootHarness();
    wrap(harness, <OnboardingCustomization onDone={vi.fn()} />);

    // Go to step 3
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Toggle showTime
    const timeSwitch = screen.getByRole("switch", {
      name: "Rādīt stundu sākuma un beigu laikus",
    });
    await clickAndSettle(() => {
      fireEvent.click(timeSwitch);
    });
    expect(harness.store.getState().settings.showTime).toBe(true);

    // Toggle mergeLessons
    const mergeSwitch = screen.getByRole("switch", {
      name: "Apvienot secīgas vienādas stundas",
    });
    await clickAndSettle(() => {
      fireEvent.click(mergeSwitch);
    });
    expect(harness.store.getState().settings.mergeConsecutiveLessons).toBe(true);

    // Toggle subject color coding
    const colorSwitch = screen.getByRole("switch", {
      name: "Priekšmetu krāsu kodēšana",
    });
    await clickAndSettle(() => {
      fireEvent.click(colorSwitch);
    });
    expect(harness.store.getState().settings.subjectColorCodingEnabled).toBe(false);
  });

  it("customizes notifications on step 4", async () => {
    const harness = await bootHarness();
    wrap(harness, <OnboardingCustomization onDone={vi.fn()} />);

    // Go to step 4
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });

    // Change reminder minutes
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("10m"));
    });
    expect(harness.store.getState().settings.notifyLessonReminderMinutes).toBe(10);

    // Toggle substitution notifications
    const subSwitch = screen.getByRole("switch", {
      name: "Paziņot par aizvietojumiem un atceltām stundām",
    });
    await clickAndSettle(() => {
      fireEvent.click(subSwitch);
    });
    expect(harness.store.getState().settings.notifySubstitutionChanges).toBe(false);
  });

  it("can be opened as a walkthrough from SettingsView", async () => {
    const harness = await bootHarness();
    wrap(harness, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    expect(screen.getByText("Pielāgošanas ceļvedis")).toBeDefined();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("Pielāgošanas ceļvedis"));
    });

    expect(screen.getByText("Pielāgo lietotnes stilu")).toBeDefined();
    expect(screen.getByText("Izskats un tēma")).toBeDefined();

    // Skip to close
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Izlaist" }));
    });

    expect(screen.getByText("Mana grupa")).toBeDefined();
  });

  it("integrates seamlessly in the overall Onboarding flow (Language -> Intro -> Customization -> Picker)", async () => {
    const { Onboarding } = await import("../../App.tsx");
    const harness = await bootHarness({ selectedClassId: null });
    wrap(harness, <Onboarding />);

    // Step 1: Language
    expect(screen.getByText("Izvēlies valodu")).toBeDefined();
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Turpināt" }));
    });

    // Step 2: Intro
    expect(screen.getByText("Stundu saraksts vienā vietā")).toBeDefined();

    // Advance through 4 intro slides
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Tālāk" }));
    });
    // On the last intro slide, advance goes to customization
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Sākt" }));
    });

    // Step 3: Customization
    expect(screen.getByText("Izskats un tēma")).toBeDefined();
    expect(screen.getByText("Pielāgo lietotnes stilu")).toBeDefined();

    // Skip customization to land on ClassPicker
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Izlaist" }));
    });

    // Step 4: ClassPicker
    expect(screen.getByText("Izvēlies savu klasi")).toBeDefined();
  });
});
