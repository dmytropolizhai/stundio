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
        <div className="no-scrollbar max-h-[58vh] overflow-y-auto overscroll-contain">
          {/* App Icon Banner */}
          <div className="flex flex-col items-center text-center pt-2 pb-3">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-raised shadow-lg border border-hairline mb-3 overflow-hidden">
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
            <h2 className="font-display text-heading font-extrabold text-strong">
              {t("iphoneInstall.title")}
            </h2>
            <p className="mt-1.5 font-text text-body text-muted max-w-[300px]">
              {t("iphoneInstall.subtitle")}
            </p>
          </div>

          {/* 2 Step Cards */}
          <div className="mt-2 space-y-2.5">
            <Card tone="surface" className="flex items-center gap-3.5 p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-600 font-display text-caption font-bold text-white shadow-sm">
                1
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-text text-body font-bold text-strong leading-snug">
                  {t("iphoneInstall.step1")}
                </p>
              </div>
            </Card>

            <Card tone="surface" className="flex items-center gap-3.5 p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-600 font-display text-caption font-bold text-white shadow-sm">
                2
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-text text-body font-bold text-strong leading-snug">
                  {t("iphoneInstall.step2")}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <Button
            variant="primary"
            icon="plus"
            block
            onClick={() => {
              void handleAddToHomeScreen();
            }}
          >
            {t("iphoneInstall.action")}
          </Button>
          <Button variant="inverse" block onClick={onClose}>
            {t("iphoneInstall.dismiss")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
