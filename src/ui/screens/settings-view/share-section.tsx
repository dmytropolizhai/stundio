import { useState } from "react";
import { useAppStore, useSettingSetter } from "@/store";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { SettingsRow } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

/** The share-language option that follows the app's own language instead of a fixed one. */
const FOLLOW_APP = "app";

/** Which language the shareable week card is written in; a rarely changed choice, so it lives under "More". */
export const ShareLanguageRow = () => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setShareLang = useAppStore((s) => s.setShareLang);
  const setShareLangSyncWithApp = useSettingSetter("shareLangSyncWithApp");
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <>
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
          void setShareLang(value);
        }}
      />
    </>
  );
};

/** The announcement a teacher can post for their class; absent for a student. */
export const TeacherShareRow = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  return (
    <SettingsRow
      icon="megaphone"
      label={t("settings.teacherShare")}
      description={t("settings.teacherShareHint")}
      onClick={onClick}
    />
  );
};
