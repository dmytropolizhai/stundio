import { useState } from "react";
import { Button, Card, Icon } from "@/ds";
import { Sheet } from "../components/Sheet.tsx";
import { useT } from "../i18n/index.ts";
import { useAppStore } from "@/store";
import { dataUrlToBase64, shareImage } from "@/lib/share";
import {
  IPHONE_PWA_URL,
  iphoneShareText,
  renderIphoneShareImage,
} from "../share/iphoneImage.ts";

export type IphoneReleaseSheetProps = {
  open: boolean;
  onClose: () => void;
};

export const IphoneReleaseSheet = ({ open, onClose }: IphoneReleaseSheetProps) => {
  const t = useT();
  const trackEvent = useAppStore((s) => s.trackEvent);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await document.fonts?.ready;
      const { dataUrl } = renderIphoneShareImage({ t });
      await shareImage({
        base64: dataUrlToBase64(dataUrl),
        fileName: "stundio-iphone.png",
        title: t("iphoneAnnouncement.shareTitle"),
        text: iphoneShareText(t),
      });
      trackEvent("share_iphone_announcement");
    } catch {
      // User cancelled or aborted the share sheet — not a failure
    } finally {
      setSharing(false);
    }
  };

  const steps = [
    {
      num: "1",
      title: t("iphoneAnnouncement.step1.title"),
      desc: t("iphoneAnnouncement.step1.desc"),
    },
    {
      num: "2",
      title: t("iphoneAnnouncement.step2.title"),
      desc: t("iphoneAnnouncement.step2.desc"),
    },
    {
      num: "3",
      title: t("iphoneAnnouncement.step3.title"),
      desc: t("iphoneAnnouncement.step3.desc"),
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("iphoneAnnouncement.title")}>
      <div className="pb-2">
        <div className="no-scrollbar max-h-[58vh] overflow-y-auto overscroll-contain">
          {/* Header Banner */}
          <div className="flex flex-col items-center text-center pt-1 pb-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-400 mb-3 ring-1 ring-sky-500/20">
              <Icon name="smartphone" size={24} />
            </div>
            <h2 className="font-display text-heading font-extrabold text-strong">
              {t("iphoneAnnouncement.headline")}
            </h2>
            <p className="mt-1.5 font-text text-body text-muted max-w-[280px]">
              {t("iphoneAnnouncement.subtitle")}
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="mt-2 space-y-2.5">
            {steps.map((step) => (
              <Card
                key={step.num}
                tone="surface"
                className="flex items-center gap-3.5 p-3.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-600 font-display text-caption font-bold text-white shadow-sm">
                  {step.num}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-text text-body font-bold text-strong leading-snug">
                    {step.title}
                  </p>
                  <p className="font-text text-caption text-muted leading-tight mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Direct link callout */}
          <div className="mt-4 rounded-xl border border-hairline bg-surface/50 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="globe" size={16} className="shrink-0 text-sky-400" />
              <span className="font-mono text-caption font-bold text-sky-400 truncate">
                {IPHONE_PWA_URL.replace(/^https:\/\//, "")}
              </span>
            </div>
            <span className="font-text text-[11px] text-muted shrink-0">
              Safari PWA
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <Button
            variant="primary"
            icon="share-2"
            block
            disabled={sharing}
            onClick={() => {
              void handleShare();
            }}
          >
            {sharing
              ? t("iphoneAnnouncement.shareWorking")
              : t("iphoneAnnouncement.share")}
          </Button>
          <Button variant="inverse" block onClick={onClose}>
            {t("iphoneAnnouncement.done")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
