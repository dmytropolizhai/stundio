import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { bootHarness, clickAndSettle } from "./harness.tsx";
import { useIphoneInstallPrompt } from "../hooks/useIphoneInstallPrompt.ts";
import { IphoneInstallSheet } from "../screens/IphoneInstallSheet.tsx";
import { SettingsView } from "../screens/SettingsView.tsx";
import { isIosDevice, isStandalonePwa } from "../lib/platform.ts";

describe("iPhone install prompt & platform detection", () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("platform detection", () => {
    it("detects iPhone in userAgent", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
      });
      expect(isIosDevice()).toBe(true);
    });

    it("detects iPadOS MacIntel with touch points", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(true);
    });

    it("returns false for Android userAgent", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(false);
    });

    it("detects standalone PWA via navigator.standalone", () => {
      vi.stubGlobal("navigator", {
        ...originalNavigator,
        standalone: true,
      });
      expect(isStandalonePwa()).toBe(true);
    });

    it("detects standalone PWA via matchMedia", () => {
      vi.stubGlobal("navigator", {
        ...originalNavigator,
        standalone: false,
      });
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(display-mode: standalone)",
      }));
      expect(isStandalonePwa()).toBe(true);
    });

    it("returns false for browser mode", () => {
      vi.stubGlobal("navigator", {
        ...originalNavigator,
        standalone: false,
      });
      vi.stubGlobal("matchMedia", () => ({
        matches: false,
      }));
      expect(isStandalonePwa()).toBe(false);
    });
  });

  describe("useIphoneInstallPrompt hook", () => {
    beforeEach(() => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
        standalone: false,
      });
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
    });

    const TestComponent = () => {
      const prompt = useIphoneInstallPrompt();
      return (
        <>
          <button type="button" onClick={prompt.show}>
            show-install
          </button>
          <IphoneInstallSheet open={prompt.open} onClose={prompt.dismiss} />
        </>
      );
    };

    it("auto-opens on launch on iOS browser when not dismissed", async () => {
      const harness = await bootHarness({ iphoneInstallPromptDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getAllByText("Pievieno Stundio sākuma ekrānam").length).toBeGreaterThan(0);
    });

    it("does not auto-open if already dismissed", async () => {
      const harness = await bootHarness({ iphoneInstallPromptDismissed: true });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryAllByText("Pievieno Stundio sākuma ekrānam").length).toBe(0);
    });

    it("does not auto-open on non-iOS devices", async () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
        platform: "Linux armv8l",
      });

      const harness = await bootHarness({ iphoneInstallPromptDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryAllByText("Pievieno Stundio sākuma ekrānam").length).toBe(0);
    });

    it("does not auto-open if already running as standalone PWA", async () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        standalone: true,
      });

      const harness = await bootHarness({ iphoneInstallPromptDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryAllByText("Pievieno Stundio sākuma ekrānam").length).toBe(0);
    });

    it("persists dismissal when user taps dismiss button", async () => {
      const harness = await bootHarness({ iphoneInstallPromptDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      const dismissBtn = screen.getByText("Turpināt pārlūkā");
      act(() => {
        fireEvent.click(dismissBtn);
      });

      expect(harness.store.getState().settings.iphoneInstallPromptDismissed).toBe(true);
    });

    it("can be reopened manually via show()", async () => {
      const harness = await bootHarness({ iphoneInstallPromptDismissed: true });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryAllByText("Pievieno Stundio sākuma ekrānam").length).toBe(0);

      act(() => {
        fireEvent.click(screen.getByText("show-install"));
      });

      expect(screen.getAllByText("Pievieno Stundio sākuma ekrānam").length).toBeGreaterThan(0);
    });
  });

  describe("IphoneInstallSheet interactions", () => {
    it("calls navigator.share when clicking primary Add to Home Screen button", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        share: shareMock,
      });

      const harness = await bootHarness();
      const trackEventSpy = vi.spyOn(harness.store.getState(), "trackEvent");

      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <IphoneInstallSheet open={true} onClose={vi.fn()} />
          </StoreContext.Provider>,
        );
      });

      const addBtn = screen.getByRole("button", { name: "Pievienot sākuma ekrānam" });
      await clickAndSettle(() => fireEvent.click(addBtn));

      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Stundio",
        }),
      );
      expect(trackEventSpy).toHaveBeenCalledWith("iphone_install_prompt_click");
    });

    it("handles aborted share without throwing error", async () => {
      const abort = new Error("AbortError");
      abort.name = "AbortError";
      const shareMock = vi.fn().mockRejectedValue(abort);
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        share: shareMock,
      });

      const harness = await bootHarness();
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <IphoneInstallSheet open={true} onClose={vi.fn()} />
          </StoreContext.Provider>,
        );
      });

      const addBtn = screen.getByRole("button", { name: "Pievienot sākuma ekrānam" });
      await clickAndSettle(() => fireEvent.click(addBtn));

      expect(screen.getAllByText("Pievieno Stundio sākuma ekrānam").length).toBeGreaterThan(0);
    });
  });

  describe("SettingsView integration", () => {
    it("shows iPhone install row when on iOS in browser mode", async () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        standalone: false,
      });
      vi.stubGlobal("matchMedia", () => ({ matches: false }));

      const onShowIphoneInstall = vi.fn();
      const harness = await bootHarness();

      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <SettingsView
              onPickClass={vi.fn()}
              onShowWhatsNew={vi.fn()}
              onShowIphoneInstall={onShowIphoneInstall}
            />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getByText("Instalēt Stundio kā lietotni savā iPhone")).toBeDefined();
      const installBtn = screen.getAllByRole("button", { name: /Pievienot sākuma ekrānam/i })[0];
      expect(installBtn).toBeDefined();

      if (installBtn) {
        act(() => {
          fireEvent.click(installBtn);
        });
        expect(onShowIphoneInstall).toHaveBeenCalled();
      }
    });
  });
});
