/**
 * The redesigned Settings screen: one row shape (icon tile, label, description, value, switch or
 * chevron), closed sets behind a `ChoiceSheet`, and every sheet opening with the row's own
 * description. Platform branches are driven through the same seams the app reads.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const env = vi.hoisted(() => ({
  isNative: false,
  isDesktop: false,
  denied: false,
  exactAllowed: true,
  webPush: false,
  ensureNotification: vi.fn(() => Promise.resolve(true)),
  ensureExact: vi.fn(() => Promise.resolve(true)),
  openSettings: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(() => Promise.resolve(true)),
  unsubscribe: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/desktop", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, isDesktop: () => env.isDesktop };
});

vi.mock("@/lib/edupage", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, isNativePlatform: () => env.isNative };
});
vi.mock("@/notifications/localNotifications", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    isNotificationPermissionDenied: () => Promise.resolve(env.denied),
    hasExactAlarmPermission: () => Promise.resolve(env.exactAllowed),
    ensureNotificationPermission: env.ensureNotification,
    ensureExactAlarmPermission: env.ensureExact,
    openNotificationSettings: env.openSettings,
  };
});
vi.mock("@/notifications/webPush", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    isWebPushSupported: () => env.webPush,
    subscribeWebPush: env.subscribe,
    unsubscribeWebPush: env.unsubscribe,
  };
});

import { StoreContext } from "@/store";
import * as updateCheckHook from "../hooks/useUpdateCheck";
import * as updateInstallHook from "../hooks/useUpdateInstall";
import { SettingsView } from "../screens/settings-view";
import { bootHarness, classIdOf, clickAndSettle, type Harness } from "./harness.tsx";

const renderSettings = (harness: Harness) =>
  render(
    <StoreContext.Provider value={harness.store}>
      <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />
    </StoreContext.Provider>,
  );

/** Lets the permission hooks' promises resolve and re-render. */
const settle = () => clickAndSettle(() => {});

const noUpdate = {
  result: null,
  checking: false,
  checked: true,
  recheck: vi.fn(),
};

const update = {
  hasUpdate: true,
  currentVersion: "v1.1.11",
  latestVersion: "v1.2.0",
  url: "https://github.com/dmytropolizhai/stundio/releases/tag/v1.2.0",
  apkUrl: "https://example.com/stundio.apk",
};

describe("Settings rows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.assign(env, {
      isNative: false,
      isDesktop: false,
      denied: false,
      exactAllowed: true,
      webPush: false,
    });
    env.ensureNotification.mockClear();
    env.ensureExact.mockClear();
    env.openSettings.mockClear();
    env.subscribe.mockClear();
    env.unsubscribe.mockClear();
  });

  it("offers desktop reminders with their runtime limit and store-managed updates", async () => {
    env.isDesktop = true;
    const harness = await bootHarness();
    renderSettings(harness);
    await settle();
    expect(screen.getByText(/Atgādinājumi darbojas, kamēr Stundio ir atvērts/)).toBeDefined();
    expect(
      screen.getByText("Jauninājumus instalē savas Linux programmatūras veikalā."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /^Atgādinājums pirms stundas/ })).toBeDefined();
    expect(screen.getByRole("switch", { name: "Jauns stundu saraksts" })).toBeDefined();
    expect(screen.queryByRole("switch", { name: "Jauninājumi" })).toBeNull();
    await clickAndSettle(() =>
      fireEvent.click(screen.getByRole("button", { name: /^Atgādinājums pirms stundas/ })),
    );
    await clickAndSettle(() =>
      fireEvent.click(screen.getByRole("radio", { name: "5 min pirms stundas" })),
    );
    expect(harness.store.getState().settings.notifyLessonReminderMinutes).toBe(5);
    expect(env.ensureNotification).toHaveBeenCalled();
    expect(env.ensureExact).not.toHaveBeenCalled();
  });

  it("describes a row and repeats the description when its sheet opens", async () => {
    const harness = await bootHarness();
    renderSettings(harness);
    const hint = "Rādīt tikai vienas ēkas sarakstu vai abu kopā.";

    expect(screen.getAllByText(hint)).toHaveLength(1);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Ēka/ }));
    });
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText(hint)).toBeDefined();
    expect(
      within(sheet).getByRole("radio", { name: "Automātiski" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("gives a choice sheet one tab stop and moves focus with the arrow keys", async () => {
    const harness = await bootHarness();
    renderSettings(harness);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Ēka/ }));
    });
    const radios = within(screen.getByRole("dialog")).getAllByRole("radio");
    expect(radios.map((radio) => radio.tabIndex)).toEqual(radios.map((_, i) => (i === 0 ? 0 : -1)));

    radios[0]!.focus();
    fireEvent.keyDown(radios[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios[1]);
    fireEvent.keyDown(radios[1]!, { key: "End" });
    expect(document.activeElement).toBe(radios.at(-1));
    fireEvent.keyDown(radios.at(-1)!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios[0]);
    // Moving focus is not a pick: the sheet stays open on the same value.
    expect(harness.store.getState().settings.building).toBeNull();
  });

  it("disables the sync row while a sync is running", async () => {
    const harness = await bootHarness();
    renderSettings(harness);
    await clickAndSettle(() => {
      harness.store.setState({ syncStatus: "syncing" });
    });
    const row = screen.getByRole("button", { name: /^Sinhronizācija/ });
    expect((row as HTMLButtonElement).disabled).toBe(true);
  });

  it("names the switch by its label and describes it by the row's description", async () => {
    const harness = await bootHarness();
    renderSettings(harness);

    const toggle = screen.getByRole("switch", { name: "Rādīt laiku" });
    const describedBy = toggle.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? "")?.textContent).toMatch(/\S/);
  });

  it("picks a subgroup for a divided class from its sheet", async () => {
    const probe = await bootHarness();
    const harness = await bootHarness({ selectedClassId: classIdOf(probe.store, "DT3-2") });
    renderSettings(harness);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Pusgrupa/ }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "Pusgrupa 2" }));
    });
    expect(harness.store.getState().settings.subgroup).toBe("2");
    // The profile card repeats it as a chip, and speaks it in its own name.
    expect(screen.getByText("Pusgrupa: 2")).toBeDefined();
    expect(screen.getByRole("button", { name: /DT3-2\. Pusgrupa: 2\./ })).toBeDefined();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Pusgrupa/ }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "Abas" }));
    });
    expect(harness.store.getState().settings.subgroup).toBeNull();
  });

  it("switches the share language between the app's and a fixed one", async () => {
    const harness = await bootHarness();
    renderSettings(harness);
    const row = () => screen.getByRole("button", { name: /^Kopīgotā attēla valoda/ });

    await clickAndSettle(() => {
      fireEvent.click(row());
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: /English/ }));
    });
    expect(harness.store.getState().settings.shareLangSyncWithApp).toBe(false);
    expect(harness.store.getState().settings.shareLang).toBe("en");
    expect(row().textContent).toContain("EN");

    await clickAndSettle(() => {
      fireEvent.click(row());
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "Kā lietotnē" }));
    });
    expect(harness.store.getState().settings.shareLangSyncWithApp).toBe(true);
  });

  it("shows the subject swatch preview even before a class is picked", async () => {
    const harness = await bootHarness({ selectedClassId: null, subjectColorCodingEnabled: false });
    renderSettings(harness);
    expect(screen.getByRole("button", { name: "Izskats" })).toBeDefined();
  });

  it("opens the feedback sheet with the row's description", async () => {
    const harness = await bootHarness();
    renderSettings(harness);

    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Ziņot par kļūdu" }));
    });
    const sheet = screen.getByRole("dialog");
    expect(
      within(sheet).getByText("Apraksti problēmu — autors to saņems kopā ar lietotnes versiju."),
    ).toBeDefined();
  });

  it("offers a static install row on iOS when no install flow is wired", async () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      standalone: false,
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const harness = await bootHarness();
    renderSettings(harness);

    expect(screen.getByText("Pievienot sākuma ekrānam")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Pievienot sākuma ekrānam/ })).toBeNull();
  });

  describe("web push", () => {
    it("subscribes and unsubscribes through the substitution switch", async () => {
      env.webPush = true;
      const harness = await bootHarness({ notifySubstitutionChanges: false });
      renderSettings(harness);

      const toggle = screen.getByRole("switch", { name: "Izmaiņas sarakstā" });
      await clickAndSettle(() => {
        fireEvent.click(toggle);
      });
      expect(env.subscribe).toHaveBeenCalled();
      expect(harness.store.getState().settings.notifySubstitutionChanges).toBe(true);

      await clickAndSettle(() => {
        fireEvent.click(screen.getByRole("switch", { name: "Izmaiņas sarakstā" }));
      });
      expect(env.unsubscribe).toHaveBeenCalled();
    });

    it("mutes the group's bell when nothing would be delivered", async () => {
      env.webPush = true;
      const harness = await bootHarness({ notifySubstitutionChanges: false });
      renderSettings(harness);

      const heading = screen.getByRole("heading", { name: "Paziņojumi" });
      expect(heading.querySelector(".lucide-bell-off")).not.toBeNull();
    });
  });

  describe("native", () => {
    it("sets the reminder lead time from its sheet and asks for both grants", async () => {
      env.isNative = true;
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue(noUpdate);
      const harness = await bootHarness();
      renderSettings(harness);
      await settle();

      await clickAndSettle(() => {
        fireEvent.click(screen.getByRole("button", { name: /^Atgādinājums pirms stundas/ }));
      });
      await clickAndSettle(() => {
        fireEvent.click(screen.getByRole("radio", { name: /^10 / }));
      });
      expect(harness.store.getState().settings.notifyLessonReminderMinutes).toBe(10);
      expect(env.ensureNotification).toHaveBeenCalled();
      await settle();
      expect(env.ensureExact).toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: /^Atgādinājums pirms stundas 10 min/ }),
      ).toBeDefined();
    });

    it("asks for permission when a native-only switch is turned on", async () => {
      env.isNative = true;
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue(noUpdate);
      const harness = await bootHarness({
        notifyNewTimetable: false,
        notifyAppUpdates: false,
        notifySubstitutionChanges: false,
      });
      renderSettings(harness);

      for (const name of ["Jauns stundu saraksts", "Jauninājumi", "Izmaiņas sarakstā"]) {
        await clickAndSettle(() => {
          fireEvent.click(screen.getByRole("switch", { name }));
        });
      }
      const s = harness.store.getState().settings;
      expect([s.notifyNewTimetable, s.notifyAppUpdates, s.notifySubstitutionChanges]).toEqual([
        true,
        true,
        true,
      ]);
      expect(env.ensureNotification).toHaveBeenCalledTimes(3);
    });

    it("reports a blocked permission and a refused exact alarm as their own rows", async () => {
      env.isNative = true;
      env.denied = true;
      env.exactAllowed = false;
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue(noUpdate);
      const harness = await bootHarness({ notifyLessonReminderMinutes: 10 });
      renderSettings(harness);
      await settle();

      expect(screen.getByText("Paziņojumi bloķēti")).toBeDefined();
      // Switches left on deliver nothing while the OS blocks them, so the bell is muted.
      const heading = screen.getByRole("heading", { name: "Paziņojumi" });
      expect(heading.querySelector(".lucide-bell-off")).not.toBeNull();
      expect(screen.getByText("Atgādinājumi var kavēties")).toBeDefined();
      const [openSystem, openAlarms] = screen.getAllByRole("button", {
        name: "Atvērt iestatījumus",
      });
      fireEvent.click(openSystem!);
      expect(env.openSettings).toHaveBeenCalled();
      fireEvent.click(openAlarms!);
      expect(env.ensureExact).toHaveBeenCalled();
    });

    it("rechecks from the update sheet when nothing new is out", async () => {
      env.isNative = true;
      const recheck = vi.fn();
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue({ ...noUpdate, recheck });
      const harness = await bootHarness();
      renderSettings(harness);

      const row = screen.getByRole("button", { name: /^Atjauninājumi Ir jaunākā versija/ });
      await clickAndSettle(() => {
        fireEvent.click(row);
      });
      const sheet = screen.getByRole("dialog");
      expect(
        within(sheet).getByText("Pārbauda un instalē jaunu versiju tieši no lietotnes."),
      ).toBeDefined();
      fireEvent.click(within(sheet).getByRole("button", { name: /Pārbaudīt/ }));
      expect(recheck).toHaveBeenCalled();
    });

    it("installs in-app from the update sheet and reports its progress and errors", async () => {
      env.isNative = true;
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue({
        ...noUpdate,
        result: update,
      });
      const install = vi.fn(() => Promise.resolve());
      const spy = vi.spyOn(updateInstallHook, "useUpdateInstall").mockReturnValue({
        phase: "idle",
        install,
        canInstallInApp: true,
      });
      const harness = await bootHarness();
      const view = renderSettings(harness);

      await clickAndSettle(() => {
        fireEvent.click(screen.getByRole("button", { name: /^Atjauninājumi/ }));
      });
      fireEvent.click(screen.getByRole("button", { name: /Lejupielādēt/ }));
      expect(install).toHaveBeenCalledWith(update.apkUrl);

      spy.mockReturnValue({ phase: "downloading", percent: 42, install, canInstallInApp: true });
      view.rerender(
        <StoreContext.Provider value={harness.store}>
          <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />
        </StoreContext.Provider>,
      );
      expect(within(screen.getByRole("dialog")).getByText(/42/)).toBeDefined();
      // The row carries the progress too, so it survives closing the sheet.
      expect(
        screen.getByRole("button", { name: /^Atjauninājumi.*42/, hidden: true }),
      ).toBeDefined();

      spy.mockReturnValue({ phase: "error", message: "boom", install, canInstallInApp: true });
      view.rerender(
        <StoreContext.Provider value={harness.store}>
          <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />
        </StoreContext.Provider>,
      );
      expect(within(screen.getByRole("dialog")).getByText(/boom/)).toBeDefined();
      expect(
        screen.getByRole("button", { name: /^Atjauninājumi.*Neizdevās atjaunināt/, hidden: true }),
      ).toBeDefined();
    });
  });
});
