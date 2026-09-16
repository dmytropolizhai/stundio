import { Button, Card } from "@/ds";
import { Sheet } from "../components/Sheet.tsx";
import { useT } from "../i18n/index.ts";
import { useAppStore } from "@/store";

export type IphoneInstallSheetProps = {
  open: boolean;
  onClose: () => void;
};

export const IphoneInstallSheet = ({ open, onClose }: IphoneInstallSheetProps) => {
  const t = useT();
  const trackEvent = useAppStore((s) => s.trackEvent);

  const handleAddToHomeScreen = async () => {
    trackEvent("iphone_install_prompt_click");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Stundio",
          url: window.location.href,
        });
      } catch {
        // User dismissed the iOS share sheet — not an error
      }
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("iphoneInstall.title")}>
      <div className="pb-2">
        <div>
          {/* App Icon Banner */}
          <div className="flex flex-col items-center text-center pt-1 pb-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-surface-raised shadow-md border border-hairline mb-2 overflow-hidden">
              <img
                src="/icons/icon-192.png"
                alt="Stundio"
                className="size-full object-cover"
                onError={(e) => {
                  // Fallback to icon if image not available
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <h2 className="font-display text-title font-bold text-strong">
              {t("iphoneInstall.title")}
            </h2>
            <p className="mt-1 font-text text-caption text-muted max-w-[300px]">
              {t("iphoneInstall.subtitle")}
            </p>
          </div>

          {/* 2 Step Cards */}
          <div className="mt-2 space-y-2">
            <Card tone="surface" className="flex items-center gap-3 p-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-600 font-display text-caption font-bold text-white shadow-xs">
                1
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-text text-caption font-bold text-strong leading-snug">
                  {t("iphoneInstall.step1")}
                </p>
              </div>
            </Card>

            <Card tone="surface" className="flex items-center gap-3 p-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-600 font-display text-caption font-bold text-white shadow-xs">
                2
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-text text-caption font-bold text-strong leading-snug">
                  {t("iphoneInstall.step2")}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2.5">
          <Button variant="inverse" className="flex-1" onClick={onClose}>
            {t("iphoneInstall.dismiss")}
          </Button>
          <Button
            variant="primary"
            icon="plus"
            className="flex-1"
            onClick={() => {
              void handleAddToHomeScreen();
            }}
          >
            {t("iphoneInstall.action")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
