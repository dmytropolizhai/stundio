import { motion } from "framer-motion";
import { useT } from "../i18n/index.ts";

export type Tab = "day" | "week" | "settings";

const TABS: { id: Tab; icon: string }[] = [
  { id: "day", icon: "▤" },
  { id: "week", icon: "▦" },
  { id: "settings", icon: "⚙" },
];

/** Bottom navigation. Sits above the gesture bar via the safe-area inset. */
export const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const t = useT();
  return (
    <nav
      className="flex shrink-0 border-t border-slate-200 bg-white pb-[var(--app-inset-bottom)] dark:border-slate-800 dark:bg-slate-900"
      aria-label={t("app.title")}
    >
      {TABS.map(({ id, icon }) => {
        const active = id === tab;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onChange(id);
            }}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              active ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {active && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent-500"
              />
            )}
            <span aria-hidden="true" className="text-lg leading-none">
              {icon}
            </span>
            {t(`nav.${id}`)}
          </button>
        );
      })}
    </nav>
  );
};
