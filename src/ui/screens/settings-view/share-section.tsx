import { Button, SegmentedTabs, Switch } from "@/ds";
import { useAppStore } from "@/store";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { isIosDevice, isStandalonePwa } from "@/ui/lib/platform.ts";
import { Row, Section } from "./settings-section.tsx";

type ShareSectionProps = {
  onShowIphoneAnnouncement?: (() => void) | undefined;
  onShowIphoneInstall?: (() => void) | undefined;
};

export const ShareSection = ({
  onShowIphoneAnnouncement,
  onShowIphoneInstall,
}: ShareSectionProps) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setShareLang = useAppStore((s) => s.setShareLang);
  const setShareLangSyncWithApp = useAppStore((s) => s.setShareLangSyncWithApp);

  return (
    <Section title={t("settings.share")}>
      <Row className="flex items-start justify-between gap-3">
        <div>
          <p className="font-text text-body font-bold text-strong">{t("settings.shareSyncLang")}</p>
          <p className="mt-0.5 font-text text-caption text-muted">
            {t("settings.shareSyncLangHint")}
          </p>
        </div>
        <Switch
          aria-label={t("settings.shareSyncLang")}
          checked={settings.shareLangSyncWithApp}
          onChange={(checked) => {
            void setShareLangSyncWithApp(checked);
          }}
        />
      </Row>
      {!settings.shareLangSyncWithApp && (
        <Row>
          <SegmentedTabs
            label={t("settings.shareLanguage")}
            value={settings.shareLang}
            items={LANGS.map((key) => ({ key, label: LANG_NAMES[key] }))}
            onChange={(value) => {
              void setShareLang(value);
            }}
          />
        </Row>
      )}
      {onShowIphoneAnnouncement !== undefined && (
        <Row className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-strong">{t("settings.iphoneShare")}</p>
            <p className="mt-0.5 font-text text-caption text-muted">
              {t("settings.iphoneShareHint")}
            </p>
          </div>
          <Button size="sm" icon="share-2" onClick={onShowIphoneAnnouncement}>
            {t("settings.iphoneShareAction")}
          </Button>
        </Row>
      )}
      {onShowIphoneInstall !== undefined && isIosDevice() && !isStandalonePwa() && (
        <Row className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-strong">
              {t("settings.iphoneInstall")}
            </p>
            <p className="mt-0.5 font-text text-caption text-muted">
              {t("settings.iphoneInstallHint")}
            </p>
          </div>
          <Button size="sm" icon="plus" onClick={onShowIphoneInstall}>
            {t("settings.iphoneInstall")}
          </Button>
        </Row>
      )}
    </Section>
  );
};
