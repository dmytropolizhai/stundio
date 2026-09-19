import { SegmentedTabs } from "@/ds";
import { useAppStore } from "@/store";
import type { Settings } from "@/db";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

type GeneralSectionProps = {
  buildings: string[];
  subgroups: string[];
};

export const GeneralSection = ({ buildings, subgroups }: GeneralSectionProps) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setSubgroup = useAppStore((s) => s.setSubgroup);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLang = useAppStore((s) => s.setLang);

  const themes: { key: Settings["theme"]; label: string }[] = [
    { key: "system", label: t("theme.system") },
    { key: "light", label: t("theme.light") },
    { key: "dark", label: t("theme.dark") },
  ];

  return (
    <>
      {buildings.length > 1 && (
        <Section title={t("settings.building")}>
          <Row>
            <SegmentedTabs
              label={t("settings.building")}
              value={settings.building ?? ""}
              items={[
                { key: "", label: t("settings.buildingAuto") },
                ...buildings.map((b) => ({ key: b, label: b })),
              ]}
              onChange={(value) => {
                void setBuilding(value === "" ? null : value);
              }}
            />
          </Row>
        </Section>
      )}

      {subgroups.length > 1 && (
        <Section title={t("settings.subgroup")}>
          <Row>
            <SegmentedTabs
              label={t("settings.subgroup")}
              value={settings.subgroup ?? ""}
              items={[
                { key: "", label: t("settings.subgroupAll") },
                ...subgroups.map((g) => ({ key: g, label: g })),
              ]}
              onChange={(value) => {
                void setSubgroup(value === "" ? null : value);
              }}
            />
          </Row>
        </Section>
      )}

      <Section title={t("settings.theme")}>
        <Row>
          <SegmentedTabs
            label={t("settings.theme")}
            value={settings.theme}
            items={themes}
            onChange={(value) => {
              void setTheme(value);
            }}
          />
        </Row>
      </Section>

      <Section title={t("settings.language")}>
        <Row>
          <SegmentedTabs
            label={t("settings.language")}
            value={settings.lang}
            items={LANGS.map((key) => ({ key, label: LANG_NAMES[key] }))}
            onChange={(value) => {
              void setLang(value);
            }}
          />
        </Row>
      </Section>
    </>
  );
};
