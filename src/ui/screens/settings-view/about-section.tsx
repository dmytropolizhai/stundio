import { Button } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import type { FeedbackType } from "@/ui/feedback.ts";
import { useUpdateCheck } from "@/ui/hooks/useUpdateCheck.ts";
import { useUpdateInstall } from "@/ui/hooks/useUpdateInstall.ts";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

type AboutSectionProps = {
  onShowWhatsNew: () => void;
  onOpenFeedback: (type: FeedbackType) => void;
};

export const AboutSection = ({ onShowWhatsNew, onOpenFeedback }: AboutSectionProps) => {
  const t = useT();
  const isNative = isNativePlatform();
  const {
    result: update,
    checking: checkingUpdate,
    checked: updateChecked,
    recheck,
  } = useUpdateCheck({ enabled: isNative });
  const install = useUpdateInstall();

  return (
    <Section title={t("settings.about")}>
      <Row>
        <p className="font-text text-caption text-muted">{t("settings.aboutText")}</p>
      </Row>
      <Row className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-text text-caption font-bold text-strong">
          {t("settings.reportIssue")}
        </span>
        <Button size="sm" icon="triangle-alert" onClick={() => onOpenFeedback("bug")}>
          {t("settings.reportIssueAction")}
        </Button>
      </Row>
      <Row className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-text text-caption font-bold text-strong">
          {t("settings.suggestFeature")}
        </span>
        <Button size="sm" icon="plus" onClick={() => onOpenFeedback("suggestion")}>
          {t("settings.suggestFeatureAction")}
        </Button>
      </Row>
      <Row className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-text text-body font-bold text-strong">{t("settings.whatsNew")}</p>
          <p className="mt-0.5 font-text text-caption text-muted">{t("settings.whatsNewHint")}</p>
        </div>
        <Button size="sm" icon="info" onClick={onShowWhatsNew}>
          {t("settings.whatsNewAction")}
        </Button>
      </Row>
      {isNative ? (
        <>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {updateChecked && !update?.hasUpdate
                  ? t("settings.upToDate")
                  : t("settings.checkForUpdates")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.currentVersion", { version: __APP_VERSION__ })}
              </p>
            </div>
            <Button size="sm" icon="refresh-cw" disabled={checkingUpdate} onClick={recheck}>
              {checkingUpdate
                ? t("settings.checkingForUpdates")
                : t("settings.checkForUpdatesAction")}
            </Button>
          </Row>
          {update?.hasUpdate && (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-text text-caption font-bold text-strong">
                {t("settings.updateAvailable", { version: update.latestVersion })}
              </span>
              {install.canInstallInApp && update.apkUrl ? (
                install.phase === "downloading" ? (
                  <span className="font-text text-caption text-muted">
                    {t("settings.updateDownloading", { percent: install.percent })}
                  </span>
                ) : (
                  (() => {
                    const apkUrl = update.apkUrl;
                    return (
                      <Button
                        size="sm"
                        icon="download"
                        onClick={() => {
                          void install.install(apkUrl);
                        }}
                      >
                        {t("settings.updateAction")}
                      </Button>
                    );
                  })()
                )
              ) : (
                <Button size="sm" icon="external-link" asChild>
                  <a href={update.url} target="_blank" rel="noreferrer">
                    {t("settings.updateAction")}
                  </a>
                </Button>
              )}
              {install.phase === "error" && (
                <p className="w-full font-text text-caption text-danger">
                  {t("settings.updateError", { message: install.message })}
                </p>
              )}
            </Row>
          )}
        </>
      ) : (
        <Row>
          <p className="font-text text-caption text-muted">
            {t("settings.currentVersion", { version: __APP_VERSION__ })}
          </p>
        </Row>
      )}
    </Section>
  );
};
