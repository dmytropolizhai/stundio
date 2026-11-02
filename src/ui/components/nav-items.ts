/**
 * The app's tabs as the nav renders them: grouped into the schedule and personal groups, with
 * icon, translated label and whether the slot is switched off. Shared by the phone's floating
 * `TabBar` and the wide layouts' `SideNav`, so both always offer the same tabs in the same order.
 * Which tabs a role gets is its profile's call (`ui/persona`), not this module's.
 */
import type { IconName } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { usePersona, type Tab } from "@/ui/persona";

/**
 * Icons come from the DS working set. Labels are translated — the DS keeps every nav word one
 * word wide precisely so it survives being rendered in Latvian.
 */
export const TAB_ICONS: Record<Tab, IconName> = {
  home: "house",
  week: "layout-grid",
  changes: "repeat",
  subjects: "graduation-cap",
  transit: "bus-front",
  settings: "settings",
};

export type NavItem = {
  key: Tab;
  icon: IconName;
  label: string;
  /** Switched off in Settings. The tab bar collapses the slot; the side rail leaves it out. */
  hidden: boolean;
};

export type NavGroup = {
  key: "schedule" | "personal";
  label: string;
  items: NavItem[];
};

/** Both groups, in order, minus any group the role has no tabs in. */
export const useNavGroups = (): NavGroup[] => {
  const t = useT();
  const { profile } = usePersona();
  const showSubjectsTab = useAppStore((s) => s.settings.showSubjectsTab);
  const showTransitTab = useAppStore((s) => s.settings.showTransitTab);

  const groups = [
    { key: "schedule", tabs: profile.nav.schedule },
    { key: "personal", tabs: profile.nav.personal },
  ] as const;

  return groups
    .filter((group) => group.tabs.length > 0)
    .map((group) => ({
      key: group.key,
      label: t(`nav.group.${group.key}`),
      items: group.tabs.map((id) => ({
        key: id,
        icon: TAB_ICONS[id],
        label: t(`nav.${id}`),
        hidden: (id === "subjects" && !showSubjectsTab) || (id === "transit" && !showTransitTab),
      })),
    }));
};
