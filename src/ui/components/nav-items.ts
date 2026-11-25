/**
 * The app's tabs as the nav renders them: grouped into the schedule and personal groups, with
 * icon, translated label and whether the slot is switched off. `useNavGroups` feeds the wide
 * layouts' `SideNav`; `useBarSlots` folds the personal group into a single "More" slot for the
 * phone's single-surface bottom bar (or promotes a lone personal tab directly to a bar slot).
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
  /** Switched off in Settings. The side rail leaves it out; the phone bar filters it. */
  hidden: boolean;
};

export type NavGroup = {
  key: "schedule" | "personal";
  label: string;
  items: NavItem[];
};

export type BarTabSlot = {
  kind: "tab";
  key: Tab;
  icon: IconName;
  label: string;
};

export type BarMoreSlot = {
  kind: "more";
  key: "more";
  icon: IconName;
  label: string;
  items: NavItem[];
};

export type BarSlot = BarTabSlot | BarMoreSlot;

export type BarSlotKey = Tab | "more";

/**
 * Folds the nav groups into slots for the phone's single bottom bar:
 * - Primary slots: visible tabs from the schedule group, in order.
 * - Personal group:
 *   - 0 visible items: no slot.
 *   - 1 visible item (e.g. teacher's lone Settings tab): promoted to a direct slot, no sheet.
 *   - 2 or more: collapsed into one `more` slot that opens `MoreSheet`.
 */
export const buildBarSlots = (groups: readonly NavGroup[], moreLabel: string): BarSlot[] => {
  const schedule =
    groups.find((g) => g.key === "schedule")?.items.filter((item) => !item.hidden) ?? [];
  const personal =
    groups.find((g) => g.key === "personal")?.items.filter((item) => !item.hidden) ?? [];

  const slots: BarSlot[] = schedule.map((item) => ({
    kind: "tab",
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  if (personal.length === 1) {
    const lone = personal[0]!;
    slots.push({
      kind: "tab",
      key: lone.key,
      icon: lone.icon,
      label: lone.label,
    });
  } else if (personal.length >= 2) {
    slots.push({
      kind: "more",
      key: "more",
      icon: "ellipsis",
      label: moreLabel,
      items: personal,
    });
  }

  return slots;
};

/** Resolves which bar slot should appear active for the current tab. */
export const activeBarSlotKey = (slots: readonly BarSlot[], tab: Tab): BarSlotKey => {
  const more = slots.find((slot): slot is BarMoreSlot => slot.kind === "more");
  if (more !== undefined && more.items.some((item) => item.key === tab)) {
    return "more";
  }
  return tab;
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

/** Phone bottom-bar slots: primary schedule tabs plus either a direct personal tab or More. */
export const useBarSlots = (): BarSlot[] => {
  const t = useT();
  const groups = useNavGroups();
  return buildBarSlots(groups, t("nav.more"));
};
