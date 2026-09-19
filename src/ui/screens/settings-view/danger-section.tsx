import { useState } from "react";
import { BottomSheet, Button } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import { isWebPushSupported, unsubscribeWebPush } from "@/notifications/webPush";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

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
        <Row className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-danger">{t("settings.resetData")}</p>
            <p className="mt-0.5 font-text text-caption text-muted">
              {t("settings.resetDataHint")}
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirmResetOpen(true);
            }}
          >
            {t("settings.resetDataAction")}
          </Button>
        </Row>
      </Section>

      <BottomSheet
        open={confirmResetOpen}
        onClose={() => {
          if (!resetting) setConfirmResetOpen(false);
        }}
        title={t("settings.resetDataConfirmTitle")}
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
        <p className="font-text text-body text-muted">{t("settings.resetDataConfirmBody")}</p>
      </BottomSheet>
    </>
  );
};
