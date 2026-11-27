/**
 * "What am I looking at": the identity (class or teacher) and the two filters that change which
 * lessons every schedule screen shows — subgroup and building — in one card at the top of
 * Settings. The filters switch in place, on chips, because they are the settings a student
 * touches most and a sheet for a choice of two or three is a detour.
 *
 * Which filters exist is decided by the caller (a teacher has no subgroups; one building needs no
 * switch); this component only draws what it is handed.
 */
import { Card, Chip, Icon } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { PERSONA_PROFILES } from "@/ui/persona";
import type { Persona } from "@/lib/persona";

/** "" is the store's `null`: no subgroup filter / no building override. */
const NONE = "";

type FilterProps = {
  label: string;
  allLabel: string;
  options: readonly string[];
  optionLabel: (option: string) => string;
  value: string | null;
  onChange: (value: string | null) => void;
};

const Filter = ({ label, allLabel, options, optionLabel, value, onChange }: FilterProps) => (
  <div role="group" aria-label={label} className="flex flex-col gap-2">
    <span className="font-text text-caption text-muted">{label}</span>
    <div className="flex flex-wrap gap-2">
      {[NONE, ...options].map((option) => {
        const selected = (value ?? NONE) === option;
        return (
          <Chip
            key={option === NONE ? "all" : option}
            selected={selected}
            aria-pressed={selected}
            className="h-9"
            onClick={() => {
              onChange(option === NONE ? null : option);
            }}
          >
            {option === NONE ? allLabel : optionLabel(option)}
          </Chip>
        );
      })}
    </div>
  </div>
);

type WatchingCardProps = {
  persona: Persona;
  /** The class short or the teacher's name; null when nothing is picked yet. */
  label: string | null;
  buildings: readonly string[];
  subgroups: readonly string[];
  onChangeIdentity: () => void;
};

export const WatchingCard = ({
  persona,
  label,
  buildings,
  subgroups,
  onChangeIdentity,
}: WatchingCardProps) => {
  const t = useT();
  const profile = PERSONA_PROFILES[persona];
  const subgroup = useAppStore((s) => s.settings.subgroup);
  const building = useAppStore((s) => s.settings.building);
  const setSubgroup = useSettingSetter("subgroup");
  const setBuilding = useSettingSetter("building");

  const showSubgroup = profile.hasSubgroups && subgroups.length > 1;
  const showBuilding = buildings.length > 1;
  const spoken = `${t(profile.roleLabel)}: ${label ?? t(profile.noneSelected)}`;

  return (
    <Card radius="xl" className="mb-8 overflow-hidden p-0">
      <button
        type="button"
        onClick={onChangeIdentity}
        aria-label={`${spoken}. ${t("settings.change")}`}
        className="flex min-h-18 w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent p-4 text-left transition-colors duration-(--dur-fast) ease-(--ease-standard) active:bg-sunken"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-text text-caption text-muted">{t(profile.roleLabel)}</span>
          <span className="truncate font-display text-title font-semibold text-strong">
            {label ?? t(profile.noneSelected)}
          </span>
        </span>
        <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
      </button>

      {(showSubgroup || showBuilding) && (
        <div className="flex flex-col gap-4 border-t border-hairline p-4">
          {showSubgroup && (
            <Filter
              label={t("settings.subgroup")}
              allLabel={t("settings.subgroupAll")}
              options={subgroups}
              optionLabel={(g) => `${t("settings.subgroup")} ${g}`}
              value={subgroup}
              onChange={(value) => void setSubgroup(value)}
            />
          )}
          {showBuilding && (
            <Filter
              label={t("settings.building")}
              allLabel={t("settings.buildingAuto")}
              options={buildings}
              optionLabel={(b) => b}
              value={building}
              onChange={(value) => void setBuilding(value)}
            />
          )}
        </div>
      )}
    </Card>
  );
};
