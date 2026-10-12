import { useState } from "react";
import { BottomSheet, Button } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import { isWebPushSupported, unsubscribeWebPush } from "@/notifications/webPush";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { SheetDescription, SheetTitle } from "./settings-sheet.tsx";

/** The one red row on the screen, in a card of its own so nothing else sits next to it. */
export const DangerSection = () => {
  const t = useT();
  const resetAllData = useAppStore((s) => s.resetAllData);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetAllData = async () => {
    setResetting(true);
    try {
      if (!isNativePlatform() && isWebPushSupported()) {
        await unsubscribeWebPush();
      }
      await resetAllData();
      setConfirmResetOpen(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <Section title={t("settings.dangerZone")}>
        <SettingsRow
          icon="trash-2"
          tone="danger"
          label={t("settings.resetData")}
          description={t("settings.resetDataHint")}
          onClick={() => {
            setConfirmResetOpen(true);
          }}
        />
      </Section>

      <BottomSheet
        open={confirmResetOpen}
        onClose={() => {
          if (!resetting) setConfirmResetOpen(false);
        }}
        title={
          <SheetTitle icon="trash-2" tone="danger">
            {t("settings.resetDataConfirmTitle")}
          </SheetTitle>
        }
        footer={
          <div className="flex flex-col gap-2.5">
            <Button
              variant="danger"
              block
              disabled={resetting}
              onClick={() => {
                void handleResetAllData();
              }}
            >
              {t("settings.resetDataConfirmButton")}
            </Button>
            <Button
              variant="outline"
              block
              disabled={resetting}
              onClick={() => {
                setConfirmResetOpen(false);
              }}
            >
              {t("settings.resetDataCancelButton")}
            </Button>
          </div>
        }
      >
        <SheetDescription>{t("settings.resetDataHint")}</SheetDescription>
        <p className="font-text text-body text-muted">{t("settings.resetDataConfirmBody")}</p>
      </BottomSheet>
    </>
  );
};
