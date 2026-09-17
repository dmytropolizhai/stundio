import { Button, Card } from "@/ds";
import { useT } from "@/ui/i18n";
import { useAppStore } from "@/store";
import { Sheet } from "../components/Sheet.tsx";
import type { ReactNode } from "react";

export type IphoneInstallSheetProps = {
  open: boolean;
  onClose: () => void;
};

type InstallStepProps = {
  number: number;
  children: ReactNode;
};

const InstallStep = ({ number, children }: InstallStepProps) => (
  <Card tone="custom" className="flex items-center gap-3.5 p-3.5">
    <div className="flex size-8 shrink-0 items-center justify-center font-display text-caption font-bold text-white shadow-sm">
      {number}
    </div>

    <p className="min-w-0 flex-1 font-text text-body font-bold leading-snug text-strong">
      {children}
    </p>
  </Card>
);

const AppIcon = () => (
  <div className="mb-3 flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-raised shadow-lg">
    <img
      src="/icons/icon-192.png"
      alt="Stundio"
      className="size-full object-cover"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  </div>
);

export const IphoneInstallSheet = ({ open, onClose }: IphoneInstallSheetProps) => {
  const t = useT();
  const trackEvent = useAppStore((state) => state.trackEvent);

  const handleAddToHomeScreen = async () => {
    trackEvent("iphone_install_prompt_click");

    if (typeof navigator === "undefined") return;
    if (typeof navigator.share !== "function") return;

    try {
      await navigator.share({
        title: "Stundio",
        url: window.location.href,
      });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("iphoneInstall.title")}>
      <div className="pb-2">
        <div className="flex flex-col items-center pb-3 pt-2 text-center">
          <AppIcon />

          <h2 className="font-display text-heading font-extrabold text-strong">
            {t("iphoneInstall.title")}
          </h2>

          <p className="mt-1.5 max-w-75 font-text text-body text-muted">
            {t("iphoneInstall.subtitle")}
          </p>
        </div>

        <div className="mt-2 space-y-2.5">
          <InstallStep number={1}>{t("iphoneInstall.step1")}</InstallStep>

          <InstallStep number={2}>{t("iphoneInstall.step2")}</InstallStep>
        </div>

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
