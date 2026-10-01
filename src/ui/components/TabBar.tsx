import { BottomNav, type BottomNavItem, type IconName } from "@/ds";
import { useT } from "@/ui/i18n";
import { usePersona, type Tab } from "@/ui/persona";

export type { Tab };

/**
 * Icons come from the DS working set. Labels are translated — the DS keeps every nav word one
 * word wide precisely so it survives being rendered in Latvian. Which tabs a role gets is its
 * profile's call (`ui/persona`), not this component's.
 */
const TAB_ICONS: Record<Tab, IconName> = {
  day: "calendar-days",
  week: "layout-grid",
  changes: "repeat",
  subjects: "graduation-cap",
  settings: "user-round",
};
/**
 * The floating nav pill. It sits 20px above the bottom edge with a 16px side inset, on top
 * of the scrolling content rather than in the layout flow — which is why every screen pads its
 * scroll area at the bottom instead of the shell reserving space here.
 */
export const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const t = useT();
  const { profile } = usePersona();

  const items: BottomNavItem<Tab>[] = profile.tabs.map((id) => ({
    key: id,
    icon: TAB_ICONS[id],
    label: t(`nav.${id}`),
  }));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-nav-inset pb-[calc(var(--space-5)+var(--app-inset-bottom))]"
      style={{ transform: "translateZ(0)" }}
    >
      <BottomNav
        items={items}
        value={tab}
        onChange={onChange}
        label={t("app.title")}
        className="pointer-events-auto w-full max-w-screen"
      />
    </div>
  );
};
