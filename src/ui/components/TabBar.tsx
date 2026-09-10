import { BottomNav, type BottomNavItem, type IconName } from "../../ds/index.ts";
import { useT } from "../i18n/index.ts";

export type Tab = "day" | "week" | "subjects" | "settings";

/**
 * Icons come from the DS working set. Labels are translated — the DS keeps every nav word one
 * word wide precisely so it survives being rendered in Latvian.
 */
const TABS: { id: Tab; icon: IconName }[] = [
  { id: "day", icon: "calendar-days" },
  { id: "week", icon: "layout-grid" },
  { id: "subjects", icon: "graduation-cap" },
  { id: "settings", icon: "user-round" },
];

/**
 * The floating black nav pill. It sits 20px above the bottom edge with a 16px side inset, on top
 * of the scrolling content rather than in the layout flow — which is why every screen pads its
 * scroll area at the bottom instead of the shell reserving space here.
 */
export const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const t = useT();
  const items: BottomNavItem<Tab>[] = TABS.map(({ id, icon }) => ({
    key: id,
    icon,
    label: t(`nav.${id}`),
  }));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-nav-inset pb-[calc(--spacing(5)+var(--app-inset-bottom))]">
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
