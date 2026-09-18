import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { bootHarness, clickAndSettle } from "./harness.tsx";
import { useIphoneAnnouncement } from "../hooks/useIphoneAnnouncement.ts";
import { IphoneReleaseSheet } from "../screens/sheets/IphoneReleaseSheet.tsx";
import { SettingsView } from "../screens/SettingsView.tsx";
import { IPHONE_PWA_URL, iphoneShareText, renderIphoneShareImage } from "../share/iphoneImage.ts";
import { translate } from "@/ui/i18n";

type StubbedCanvas = { getContext: unknown; toDataURL: unknown };
const canvasPrototype = HTMLCanvasElement.prototype as unknown as StubbedCanvas;
const realCanvas: StubbedCanvas = { ...canvasPrototype };

const stubDrawingContext = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arcTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  fillRect: vi.fn(),
  measureText: (text: string) => ({ width: text.length * 8 }),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  font: "",
  textAlign: "",
  textBaseline: "",
  globalAlpha: 1,
});

describe("iPhone announcement & share", () => {
  beforeEach(() => {
    const ctx = stubDrawingContext();
    canvasPrototype.getContext = () => ctx;
    canvasPrototype.toDataURL = () => "data:image/png;base64,QUJD";
  });

  afterEach(() => {
    Object.assign(canvasPrototype, realCanvas);
    vi.restoreAllMocks();
  });

  describe("share image & text generation", () => {
    it("generates localized tutorial text containing steps and PWA URL", () => {
      const t = (k: Parameters<typeof translate>[1]) => translate("lv", k);
      const text = iphoneShareText(t);
      expect(text).toContain("Stundio tagad pieejams iPhone!");
      expect(text).toContain("1. Atver Safari");
      expect(text).toContain("2. Nospied «Kopīgot»");
      expect(text).toContain("3. Izvēlies «Pievienot sākuma ekrānam»");
      expect(text).toContain(IPHONE_PWA_URL);
    });

    it("generates tutorial text in English", () => {
      const t = (k: Parameters<typeof translate>[1]) => translate("en", k);
      const text = iphoneShareText(t);
      expect(text).toContain("Stundio is now available on iPhone!");
      expect(text).toContain("1. Open Safari");
      expect(text).toContain("2. Tap the Share button");
      expect(text).toContain('3. Tap "Add to Home Screen"');
      expect(text).toContain(IPHONE_PWA_URL);
    });

    it("renders canvas card and returns dataUrl and dimensions", () => {
      const t = (k: Parameters<typeof translate>[1]) => translate("lv", k);
      const image = renderIphoneShareImage({ t, scale: 2 });
      expect(image.width).toBe(1280);
      expect(image.height).toBe(1680);
      expect(image.dataUrl).toBe("data:image/png;base64,QUJD");
    });

    it("throws error if 2D context is missing", () => {
      const t = (k: Parameters<typeof translate>[1]) => translate("lv", k);
      expect(() =>
        renderIphoneShareImage({
          t,
          createCanvas: () => ({
            width: 100,
            height: 100,
            getContext: () => null,
            toDataURL: () => "",
          }),
        }),
      ).toThrow("Canvas 2D context is unavailable");
    });
  });

  describe("startup announcement hook", () => {
    const TestComponent = ({ onShareOpen }: { onShareOpen?: () => void }) => {
      const announcement = useIphoneAnnouncement();
      return (
        <>
          <button type="button" onClick={announcement.show}>
            show-announcement
          </button>
          <IphoneReleaseSheet
            open={announcement.open}
            onClose={() => {
              announcement.dismiss();
              onShareOpen?.();
            }}
          />
        </>
      );
    };

    it("auto-opens on launch if announcement has not been dismissed", async () => {
      const harness = await bootHarness({ iphoneAnnouncementDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getByText("Tagad arī pieejams uz iPhone")).toBeDefined();
      expect(screen.getByText("Atver Safari")).toBeDefined();
      expect(screen.getByText("Nospied «Kopīgot»")).toBeDefined();
      expect(screen.getByText("Pievieno sākuma ekrānam")).toBeDefined();
    });

    it("does not auto-open if already dismissed", async () => {
      const harness = await bootHarness({ iphoneAnnouncementDismissed: true });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryByText("Tagad arī pieejams uz iPhone")).toBeNull();
    });

    it("persists dismissal when user taps 'Sapratu' (Got it)", async () => {
      const harness = await bootHarness({ iphoneAnnouncementDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      const dismissBtn = screen.getByText("Sapratu");
      act(() => {
        fireEvent.click(dismissBtn);
      });

      expect(harness.store.getState().settings.iphoneAnnouncementDismissed).toBe(true);
    });

    it("reopens when show is invoked manually", async () => {
      const harness = await bootHarness({ iphoneAnnouncementDismissed: true });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryByText("Tagad arī pieejams uz iPhone")).toBeNull();

      act(() => {
        fireEvent.click(screen.getByText("show-announcement"));
      });

      expect(screen.getByText("Tagad arī pieejams uz iPhone")).toBeDefined();
    });
  });

  describe("sharing flow from sheet", () => {
    it("calls navigator.share with image and tutorial text when share button is tapped", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { share: shareMock, canShare: () => true });

      const harness = await bootHarness({ iphoneAnnouncementDismissed: false });
      const trackEventSpy = vi.spyOn(harness.store.getState(), "trackEvent");

      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <IphoneReleaseSheet open={true} onClose={vi.fn()} />
          </StoreContext.Provider>,
        );
      });

      const shareBtn = screen.getByText("Kopīgot ar draugiem");
      await clickAndSettle(() => fireEvent.click(shareBtn));

      expect(shareMock).toHaveBeenCalled();
      const payload = shareMock.mock.calls[0]?.[0] as {
        title: string;
        text: string;
        files?: File[];
      };
      expect(payload.title).toBe("Stundio uz iPhone");
      expect(payload.text).toContain("https://stundio.pages.dev");
      expect(payload.files?.[0]?.name).toBe("stundio-iphone.png");
      expect(trackEventSpy).toHaveBeenCalledWith("share_iphone_announcement");
    });

    it("handles cancelled share sheet without throwing", async () => {
      const abort = new Error("AbortError");
      abort.name = "AbortError";
      const shareMock = vi.fn().mockRejectedValue(abort);
      vi.stubGlobal("navigator", { share: shareMock, canShare: () => true });

      const harness = await bootHarness({ iphoneAnnouncementDismissed: false });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <IphoneReleaseSheet open={true} onClose={vi.fn()} />
          </StoreContext.Provider>,
        );
      });

      const shareBtn = screen.getByText("Kopīgot ar draugiem");
      await clickAndSettle(() => fireEvent.click(shareBtn));

      // Does not throw and returns to normal state
      expect(screen.getByText("Kopīgot ar draugiem")).toBeDefined();
    });
  });

  describe("SettingsView integration", () => {
    it("renders iPhone share row in Settings and calls onShowIphoneAnnouncement", async () => {
      const onShowIphoneAnnouncement = vi.fn();
      const harness = await bootHarness();

      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <SettingsView
              onPickClass={vi.fn()}
              onShowWhatsNew={vi.fn()}
              onShowIphoneAnnouncement={onShowIphoneAnnouncement}
            />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getByText("Stundio uz iPhone")).toBeDefined();
      const shareButton = screen.getAllByRole("button", { name: /Kopīgot/i })[0];
      expect(shareButton).toBeDefined();

      if (shareButton) {
        act(() => {
          fireEvent.click(shareButton);
        });
        expect(onShowIphoneAnnouncement).toHaveBeenCalled();
      }
    });
  });
});
