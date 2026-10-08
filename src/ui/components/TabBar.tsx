import { BottomNav, cn, type BottomNavItem, type IconName } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { usePersona, type Tab } from "@/ui/persona";

export type { Tab };

/**
 * Icons come from the DS working set. Labels are translated — the DS keeps every nav word one
 * word wide precisely so it survives being rendered in Latvian. Which tabs a role gets is its
 * profile's call (`ui/persona`), not this component's.
 */
const TAB_ICONS: Record<Tab, IconName> = {
  home: "house",
  week: "layout-grid",
  changes: "repeat",
  subjects: "graduation-cap",
  settings: "settings",
};
/**
 * The floating nav: two separate pills side by side, each on its own shadow. The schedule pill
 * (home, week, changes) stretches and keeps its labels — it is where the thumb goes many times a
 * day. The personal pill (subjects, settings — a teacher's is settings alone, a lone circle) is
 * icon-only and hugs its icons, which leaves the labelled slots room for "Налаштування"-length
 * words. Which tab sits in which pill is the persona profile's call; the Subjects slot can be
 * switched off in Settings (`showSubjectsTab`), and switching it back on expands it out of the
 * right-anchored pill.
 *
 * The row sits 20px above the bottom edge with a 16px side inset, on top of the scrolling
 * content rather than in the layout flow — which is why every screen pads its scroll area at the
 * bottom instead of the shell reserving space here.
 */
export const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const t = useT();
  const { profile } = usePersona();
  const showSubjectsTab = useAppStore((s) => s.settings.showSubjectsTab);

  const groups = [
    { key: "schedule", tabs: profile.nav.schedule },
    { key: "personal", tabs: profile.nav.personal },
  ] as const;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-nav-inset pb-[calc(var(--space-5)+var(--app-inset-bottom))]"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="flex w-full max-w-screen gap-3">
        {groups
          .filter((group) => group.tabs.length > 0)
          .map((group) => {
            const items: BottomNavItem<Tab>[] = group.tabs.map((id) => ({
              key: id,
              icon: TAB_ICONS[id],
              label: t(`nav.${id}`),
              // Collapsed, not dropped: switching it back on grows the slot out of the pill.
              hidden: id === "subjects" && !showSubjectsTab,
            }));
            return (
              <BottomNav
                key={group.key}
                items={items}
                value={tab}
                onChange={onChange}
                label={t(`nav.group.${group.key}`)}
                compact={group.key === "personal"}
                className={cn("pointer-events-auto", group.key === "schedule" && "min-w-0 flex-1")}
              />
            );
          })}
      </div>
    </div>
  );
};
