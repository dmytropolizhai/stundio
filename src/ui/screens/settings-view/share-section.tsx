import { useState } from "react";
import { useAppStore } from "@/store";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { isIosDevice, isStandalonePwa } from "@/ui/lib/platform.ts";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

/** The share-language option that follows the app's own language instead of a fixed one. */
const FOLLOW_APP = "app";

type ShareSectionProps = {
  onShowTeacherAnnouncement?: (() => void) | undefined;
  onShowIphoneInstall?: (() => void) | undefined;
};

export const ShareSection = ({
  onShowTeacherAnnouncement,
  onShowIphoneInstall,
}: ShareSectionProps) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setShareLang = useAppStore((s) => s.setShareLang);
  const setShareLangSyncWithApp = useAppStore((s) => s.setShareLangSyncWithApp);
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <Section title={t("settings.share")}>
      <SettingsRow
        icon="image"
        label={t("settings.shareLanguage")}
        description={t("settings.shareLanguageHint")}
        value={
          settings.shareLangSyncWithApp
            ? t("settings.shareLangFollowApp")
            : settings.shareLang.toUpperCase()
        }
        onClick={() => setLanguageOpen(true)}
      />
      {onShowTeacherAnnouncement !== undefined && (
        <SettingsRow
          icon="megaphone"
          label={t("settings.teacherShare")}
          description={t("settings.teacherShareHint")}
          onClick={onShowTeacherAnnouncement}
        />
      )}
      {onShowIphoneInstall !== undefined && isIosDevice() && !isStandalonePwa() && (
        <SettingsRow
          icon="smartphone"
          label={t("settings.iphoneInstall")}
          description={t("settings.iphoneInstallHint")}
          onClick={onShowIphoneInstall}
        />
      )}

      <ChoiceSheet
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        icon="image"
        title={t("settings.shareLanguage")}
        description={t("settings.shareLanguageHint")}
        options={[
          { key: FOLLOW_APP, label: t("settings.shareLangFollowApp") },
          ...LANGS.map((key) => ({ key, label: LANG_NAMES[key], detail: key.toUpperCase() })),
        ]}
        value={settings.shareLangSyncWithApp ? FOLLOW_APP : settings.shareLang}
        onChange={(value) => {
          if (value === FOLLOW_APP) {
            void setShareLangSyncWithApp(true);
            return;
          }
          void setShareLangSyncWithApp(false);
          void setShareLang(value);
        }}
      />
    </Section>
  );
};
