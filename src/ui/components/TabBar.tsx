import { BottomNav, cn } from "@/ds";
import type { Tab } from "@/ui/persona";
import { useNavGroups } from "./nav-items.ts";

export type { Tab };

/**
 * The phone's floating nav: two separate pills side by side, each on its own shadow. The schedule
 * pill (home, week, changes) stretches and keeps its labels — it is where the thumb goes many
 * times a day. The personal pill (subjects, settings — a teacher's is settings alone, a lone
 * circle) is icon-only and hugs its icons, which leaves the labelled slots room for
 * "Налаштування"-length words. Which tab sits in which pill comes from `useNavGroups`; the
 * Subjects slot can be switched off in Settings (`showSubjectsTab`), and switching it back on
 * expands it out of the right-anchored pill.
 *
 * The row sits 20px above the bottom edge with a 16px side inset, on top of the scrolling
 * content rather than in the layout flow — which is why every screen pads its scroll area at the
 * bottom instead of the shell reserving space here. Wide layouts use `SideNav` instead.
 */
export const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const groups = useNavGroups();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-nav-inset pb-[calc(var(--space-5)+var(--app-inset-bottom))]"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="flex w-full max-w-screen gap-3">
        {groups.map((group) => (
          <BottomNav
            key={group.key}
            // Collapsed, not dropped: switching a slot back on grows it out of the pill.
            items={group.items}
            value={tab}
            onChange={onChange}
            label={group.label}
            compact={group.key === "personal"}
            className={cn("pointer-events-auto", group.key === "schedule" && "min-w-0 flex-1")}
          />
        ))}
      </div>
    </div>
  );
};
