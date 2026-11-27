import { useState } from "react";
import { BottomSheet } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { LanguageList } from "@/ui/screens/onboarding-language";
import { SettingsRow } from "./settings-row.tsx";
import { SheetDescription, SheetTitle } from "./settings-sheet.tsx";

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
      <BottomSheet
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title={<SheetTitle icon="image">{t("settings.shareLanguage")}</SheetTitle>}
      >
        <SheetDescription>{t("settings.shareLanguageHint")}</SheetDescription>
        <div className="pb-1">
          <LanguageList
            label={t("settings.shareLanguage")}
            selectedLang={settings.shareLangSyncWithApp ? null : settings.shareLang}
            leadingOption={{
              label: t("settings.shareLangFollowApp"),
              selected: settings.shareLangSyncWithApp,
              onSelect: () => {
                void setShareLangSyncWithApp(true);
                setLanguageOpen(false);
              },
            }}
            onSelect={(value) => {
              void setShareLang(value);
              setLanguageOpen(false);
            }}
          />
        </div>
      </BottomSheet>
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
