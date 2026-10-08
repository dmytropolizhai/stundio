/**
 * Which tabs the bottom nav shows. Only the Subjects tab is optional — the schedule pill is the
 * app's whole job, and Settings has to stay reachable to switch Subjects back on. A role whose
 * nav has no Subjects tab (a teacher) gets no section at all.
 */
import { Switch } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { usePersona } from "@/ui/persona";
import { Row, Section } from "./settings-section.tsx";

export const NavigationSection = () => {
  const t = useT();
  const { profile } = usePersona();
  const showSubjectsTab = useAppStore((s) => s.settings.showSubjectsTab);
  const setShowSubjectsTab = useAppStore((s) => s.setShowSubjectsTab);

  if (!profile.nav.personal.includes("subjects")) return null;

  return (
    <Section title={t("settings.navigation")}>
      <Row className="flex items-start justify-between gap-3">
        <div>
          <p className="font-text text-body font-bold text-strong">
            {t("settings.showSubjectsTab")}
          </p>
          <p className="mt-0.5 font-text text-caption text-muted">
            {t("settings.showSubjectsTabHint")}
          </p>
        </div>
        <Switch
          aria-label={t("settings.showSubjectsTab")}
          checked={showSubjectsTab}
          onChange={(checked) => {
            void setShowSubjectsTab(checked);
          }}
        />
      </Row>
    </Section>
  );
};
