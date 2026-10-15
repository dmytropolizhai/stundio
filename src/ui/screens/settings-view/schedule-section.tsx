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
};

/** "" is the store's `null`: no subgroup filter / no building override. */
const NONE = "";

/**
 * Everything that changes what the schedule screens show: which lessons (subgroup, building),
 * how they are drawn (merging, moved lessons, times).
 */
export const ScheduleSection = ({ buildings, subgroups }: ScheduleSectionProps) => {
  const t = useT();
  const { profile } = usePersona();
  const settings = useAppStore((s) => s.settings);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setSubgroup = useAppStore((s) => s.setSubgroup);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setShowMovedOnTargetDay = useAppStore((s) => s.setShowMovedOnTargetDay);
  const setShowTime = useAppStore((s) => s.setShowTime);
  const [sheet, setSheet] = useState<"subgroup" | "building" | null>(null);

  const showSubgroup = profile.hasSubgroups && subgroups.length > 1;
  const showBuilding = buildings.length > 1;

  const subgroupOptions = [
    { key: NONE, label: t("settings.subgroupAll") },
    ...subgroups.map((g) => ({ key: g, label: `${t("settings.subgroup")} ${g}` })),
  ];
  const buildingOptions = [
    { key: NONE, label: t("settings.buildingAuto") },
    ...buildings.map((b) => ({ key: b, label: b })),
  ];

  return (
    <Section title={t("settings.group.schedule")}>
      {showSubgroup && (
        <SettingsRow
          icon="users"
          label={t("settings.subgroup")}
          description={t("settings.subgroupHint")}
          value={settings.subgroup ?? t("settings.subgroupAll")}
          onClick={() => setSheet("subgroup")}
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
      <SettingsRow
        icon="arrow-left-right"
        label={t("settings.movedOnTarget")}
        description={t("settings.movedOnTargetHint")}
        checked={settings.showMovedOnTargetDay}
        onCheckedChange={(checked) => void setShowMovedOnTargetDay(checked)}
      />
      <SettingsRow
        icon="clock"
        label={t("settings.showTime")}
        description={t("settings.showTimeHint")}
        checked={settings.showTime}
        onCheckedChange={(checked) => void setShowTime(checked)}
      />

      <ChoiceSheet
        open={sheet === "subgroup"}
        onClose={() => setSheet(null)}
        icon="users"
        title={t("settings.subgroup")}
        description={t("settings.subgroupHint")}
        options={subgroupOptions}
        value={settings.subgroup ?? NONE}
        onChange={(value) => void setSubgroup(value === NONE ? null : value)}
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
