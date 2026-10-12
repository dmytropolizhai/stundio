import { useState } from "react";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { usePersona } from "@/ui/persona";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

type ScheduleSectionProps = {
  buildings: string[];
  subgroups: string[];
  /** The role's current subgroup and its setter — a class division, or an LU child group. */
  subgroup: string | null;
  onSubgroupChange: (subgroup: string | null) => void;
  /** What a subgroup is called: RVT's "Pusgrupa", LU's "Apakšgrupa". */
  subgroupTitle: string;
  /** How one subgroup reads in the picker: "Pusgrupa 2" for RVT, verbatim for LU. */
  subgroupLabel: (subgroup: string) => string;
};

/** "" is the store's `null`: no subgroup filter / no building override. */
const NONE = "";

/**
 * Everything that changes what the schedule screens show: which lessons (subgroup, building),
 * how they are drawn (merging, moved lessons, times) and whether the Subjects tab exists.
 */
export const ScheduleSection = ({
  buildings,
  subgroups,
  subgroup,
  onSubgroupChange,
  subgroupTitle,
  subgroupLabel,
}: ScheduleSectionProps) => {
  const t = useT();
  const { profile } = usePersona();
  const settings = useAppStore((s) => s.settings);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setShowMovedOnTargetDay = useAppStore((s) => s.setShowMovedOnTargetDay);
  const setShowTime = useAppStore((s) => s.setShowTime);
  const setShowSubjectsTab = useAppStore((s) => s.setShowSubjectsTab);
  const setUniversityNames = useAppStore((s) => s.setUniversityNames);
  const [sheet, setSheet] = useState<"subgroup" | "building" | "names" | null>(null);

  const showSubgroup = profile.hasSubgroups && subgroups.length > 1;
  const showBuilding = buildings.length > 1;
  // Only the Subjects tab is optional: a role whose nav has none (a teacher) gets no switch.
  const showSubjectsTab = profile.nav.personal.includes("subjects");

  const subgroupOptions = [
    { key: NONE, label: t("settings.subgroupAll") },
    ...subgroups.map((g) => ({ key: g, label: subgroupLabel(g) })),
  ];
  const namesOptions = (["auto", "lv", "en"] as const).map((key) => ({
    key,
    label: t(`settings.universityNames.${key}`),
  }));
  const buildingOptions = [
    { key: NONE, label: t("settings.buildingAuto") },
    ...buildings.map((b) => ({ key: b, label: b })),
  ];

  return (
    <Section title={t("settings.group.schedule")}>
      {showSubgroup && (
        <SettingsRow
          icon="users"
          label={subgroupTitle}
          description={t("settings.subgroupHint")}
          value={subgroup ?? t("settings.subgroupAll")}
          onClick={() => setSheet("subgroup")}
        />
      )}
      {profile.hasEnglishNames && (
        <SettingsRow
          icon="globe"
          label={t("settings.universityNames")}
          description={t("settings.universityNamesHint")}
          value={t(`settings.universityNames.${settings.universityNames}`)}
          onClick={() => setSheet("names")}
        />
      )}
      {showBuilding && (
        <SettingsRow
          icon="building-2"
          label={t("settings.building")}
          description={t("settings.buildingHint")}
          value={settings.building ?? t("settings.buildingAuto")}
          onClick={() => setSheet("building")}
        />
      )}
      <SettingsRow
        icon="layers"
        label={t("settings.mergeLessons")}
        description={t("settings.mergeLessonsHint")}
        checked={settings.mergeConsecutiveLessons}
        onCheckedChange={(checked) => void setMergeConsecutiveLessons(checked)}
      />
      {profile.hasChangeFeed && (
        <SettingsRow
          icon="arrow-left-right"
          label={t("settings.movedOnTarget")}
          description={t("settings.movedOnTargetHint")}
          checked={settings.showMovedOnTargetDay}
          onCheckedChange={(checked) => void setShowMovedOnTargetDay(checked)}
        />
      )}
      <SettingsRow
        icon="clock"
        label={t("settings.showTime")}
        description={t("settings.showTimeHint")}
        checked={settings.showTime}
        onCheckedChange={(checked) => void setShowTime(checked)}
      />
      {showSubjectsTab && (
        <SettingsRow
          icon="panel-bottom"
          label={t("settings.showSubjectsTab")}
          description={t("settings.showSubjectsTabHint")}
          checked={settings.showSubjectsTab}
          onCheckedChange={(checked) => void setShowSubjectsTab(checked)}
        />
      )}

      <ChoiceSheet
        open={sheet === "subgroup"}
        onClose={() => setSheet(null)}
        icon="users"
        title={subgroupTitle}
        description={t("settings.subgroupHint")}
        options={subgroupOptions}
        value={subgroup ?? NONE}
        onChange={(value) => {
          onSubgroupChange(value === NONE ? null : value);
        }}
      />
      <ChoiceSheet
        open={sheet === "names"}
        onClose={() => setSheet(null)}
        icon="globe"
        title={t("settings.universityNames")}
        description={t("settings.universityNamesHint")}
        options={namesOptions}
        value={settings.universityNames}
        onChange={(value) => void setUniversityNames(value)}
      />
      <ChoiceSheet
        open={sheet === "building"}
        onClose={() => setSheet(null)}
        icon="building-2"
        title={t("settings.building")}
        description={t("settings.buildingHint")}
        options={buildingOptions}
        value={settings.building ?? NONE}
        onChange={(value) => void setBuilding(value === NONE ? null : value)}
      />
    </Section>
  );
};
