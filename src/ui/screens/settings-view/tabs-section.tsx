import { useAppStore, useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { usePersona } from "@/ui/persona";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";

/**
 * Which optional tabs the bottom nav carries. A role whose nav lacks a tab (a teacher has no
 * Subjects) is not offered its switch, and the whole group disappears when none are left.
 */
export const TabsSection = () => {
  const t = useT();
  const { profile } = usePersona();
  const settings = useAppStore((s) => s.settings);
  const setShowSubjectsTab = useSettingSetter("showSubjectsTab");
  const setShowTransitTab = useSettingSetter("showTransitTab");

  const hasSubjects = profile.nav.personal.includes("subjects");
  const hasTransit = profile.nav.personal.includes("transit");
  if (!hasSubjects && !hasTransit) return null;

  return (
    <Section title={t("settings.group.tabs")}>
      {hasSubjects && (
        <SettingsRow
          icon="panel-bottom"
          label={t("settings.showSubjectsTab")}
          description={t("settings.showSubjectsTabHint")}
          checked={settings.showSubjectsTab}
          onCheckedChange={(checked) => void setShowSubjectsTab(checked)}
        />
      )}
      {hasTransit && (
        <SettingsRow
          icon="bus-front"
          label={t("settings.showTransitTab")}
          description={t("settings.showTransitTabHint")}
          checked={settings.showTransitTab}
          onCheckedChange={(checked) => void setShowTransitTab(checked)}
        />
      )}
    </Section>
  );
};
