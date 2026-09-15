import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "../../store/index.ts";
import { bootHarness, clickAndSettle } from "./harness.tsx";
import { isAndroidDevice } from "../lib/platform.ts";
import { AndroidDownloadBanner } from "../components/AndroidDownloadBanner.tsx";
import { InAppUpdatePrompt } from "../components/InAppUpdatePrompt.tsx";
import * as edupageModule from "@/lib/edupage";
import * as updateCheckHook from "../hooks/useUpdateCheck.ts";
import * as updateInstallHook from "../hooks/useUpdateInstall.ts";

describe("Android download banner & in-app update prompt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAndroidDevice detection", () => {
    it("returns true for Android userAgent", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
      });
      expect(isAndroidDevice()).toBe(true);
    });

    it("returns false for non-Android userAgent", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      expect(isAndroidDevice()).toBe(false);
    });
  });

  describe("AndroidDownloadBanner", () => {
    beforeEach(() => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
      });
      vi.spyOn(edupageModule, "isNativePlatform").mockReturnValue(false);
    });

    it("renders download banner for Android browser users", async () => {
      const harness = await bootHarness();
      render(
        <StoreContext.Provider value={harness.store}>
          <AndroidDownloadBanner />
        </StoreContext.Provider>,
      );

      const banner = screen.getByTestId("android-download-banner");
      expect(banner).toBeDefined();
      const link = screen.getByRole("link", { name: /Lejupielādēt APK|Download APK/i });
      expect(link.getAttribute("href")).toBe("/apk");
    });

    it("hides when running inside native app", async () => {
      vi.spyOn(edupageModule, "isNativePlatform").mockReturnValue(true);
      const harness = await bootHarness();
      render(
        <StoreContext.Provider value={harness.store}>
          <AndroidDownloadBanner />
        </StoreContext.Provider>,
      );

      expect(screen.queryByTestId("android-download-banner")).toBeNull();
    });

    it("dismisses and persists preference when close button is clicked", async () => {
      const harness = await bootHarness();
      render(
        <StoreContext.Provider value={harness.store}>
          <AndroidDownloadBanner />
        </StoreContext.Provider>,
      );

      const dismissBtn = screen.getByRole("button", { name: /Aizvērt|Dismiss/i });
      await clickAndSettle(() => fireEvent.click(dismissBtn));

      expect(harness.store.getState().settings.androidApkBannerDismissed).toBe(true);
      expect(screen.queryByTestId("android-download-banner")).toBeNull();
    });
  });

  describe("InAppUpdatePrompt", () => {
    beforeEach(() => {
      vi.spyOn(edupageModule, "isNativePlatform").mockReturnValue(true);
    });

    it("renders update prompt when update is available in native app", async () => {
      const harness = await bootHarness();
      const installMock = vi.fn();
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue({
        result: {
          hasUpdate: true,
          currentVersion: "v1.1.11",
          latestVersion: "v1.2.0",
          url: "https://github.com/dmytropolizhai/stundio/releases/tag/v1.2.0",
          apkUrl: "https://example.com/stundio.apk",
        },
        checking: false,
        checked: true,
        recheck: vi.fn(),
      });

      vi.spyOn(updateInstallHook, "useUpdateInstall").mockReturnValue({
        phase: "idle",
        install: installMock,
        canInstallInApp: true,
      });

      render(
        <StoreContext.Provider value={harness.store}>
          <InAppUpdatePrompt />
        </StoreContext.Provider>,
      );

      expect(screen.getByTestId("in-app-update-prompt")).toBeDefined();
      expect(screen.getByText(/v1.2.0/)).toBeDefined();

      const updateBtn = screen.getByRole("button", { name: /Atjaunināt|Update/i });
      fireEvent.click(updateBtn);
      expect(installMock).toHaveBeenCalledWith("https://example.com/stundio.apk");
    });

    it("hides when no update is available", async () => {
      const harness = await bootHarness();
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue({
        result: {
          hasUpdate: false,
          currentVersion: "v1.1.11",
          latestVersion: "v1.1.11",
          url: "https://github.com/dmytropolizhai/stundio/releases/tag/v1.1.11",
          apkUrl: null,
        },
        checking: false,
        checked: true,
        recheck: vi.fn(),
      });

      render(
        <StoreContext.Provider value={harness.store}>
          <InAppUpdatePrompt />
        </StoreContext.Provider>,
      );
      expect(screen.queryByTestId("in-app-update-prompt")).toBeNull();
    });

    it("displays progress percent while downloading", async () => {
      const harness = await bootHarness();
      vi.spyOn(updateCheckHook, "useUpdateCheck").mockReturnValue({
        result: {
          hasUpdate: true,
          currentVersion: "v1.1.11",
          latestVersion: "v1.2.0",
          url: "https://github.com/dmytropolizhai/stundio/releases/tag/v1.2.0",
          apkUrl: "https://example.com/stundio.apk",
        },
        checking: false,
        checked: true,
        recheck: vi.fn(),
      });

      vi.spyOn(updateInstallHook, "useUpdateInstall").mockReturnValue({
        phase: "downloading",
        percent: 42,
        install: vi.fn(),
        canInstallInApp: true,
      });

      render(
        <StoreContext.Provider value={harness.store}>
          <InAppUpdatePrompt />
        </StoreContext.Provider>,
      );
      expect(screen.getByText("42%")).toBeDefined();
    });
  });
});
