import { Icon, cn } from "@/ds";
import { useT } from "@/ui/i18n";

type SubgroupListProps = {
  subgroups: string[];
  onPick: (label: string) => void;
};

/**
 * Continuous liquid-glass subgroup slab matching `LanguageList` and Home schedule rows.
 */
export const SubgroupList = ({ subgroups, onPick }: SubgroupListProps) => {
  const t = useT();

  return (
    <ul className="u-schedule-glass flex w-full flex-col divide-y divide-(--schedule-divider) overflow-hidden rounded-xl">
      {subgroups.map((label) => (
        <li key={label}>
          <button
            type="button"
            onClick={() => {
              onPick(label);
            }}
            className={cn(
              "group flex min-h-15 w-full cursor-pointer items-center justify-between gap-3 px-4.5 py-3.5 text-left",
              "transition-[background-color,transform] duration-(--dur-fast) ease-(--ease-standard)",
              "hover:bg-(--schedule-row-hover) active:scale-[0.99] active:duration-(--dur-instant)",
              "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
            )}
          >
            <div className="flex items-center gap-3.5">
              <span className="u-schedule-room-pill u-data flex size-8 shrink-0 items-center justify-center rounded-pill text-caption font-bold text-strong">
                {label}
              </span>
              <span className="font-text text-body font-bold text-strong">
                {t("subgroup.option", { label })}
              </span>
            </div>

            <Icon
              name="chevron-right"
              size={18}
              className="shrink-0 text-muted transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:text-strong"
            />
          </button>
        </li>
      ))}
    </ul>
  );
};
