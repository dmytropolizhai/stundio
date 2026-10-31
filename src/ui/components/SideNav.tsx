/**
 * The wide layouts' nav: a rail down the left edge instead of the phone's floating pills, which
 * would sit over the content where a mouse, not a thumb, does the pointing. Same groups, same
 * tabs, same order as `TabBar` (both read `useNavGroups`).
 *
 * Tablet gets an icon-only rail, so the day keeps most of the width; desktop gets the labelled
 * one with the group names. A tab switched off in Settings is left out here rather than
 * collapsed: there is no pill whose width has to animate around it.
 */
import { cn, Icon } from "@/ds";
import { useT } from "@/ui/i18n";
import type { Tab } from "@/ui/persona";
import { useNavGroups } from "./nav-items.ts";

type SideNavProps = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  /** Labelled (desktop) rather than icon-only (tablet). */
  expanded: boolean;
};

export const SideNav = ({ tab, onChange, expanded }: SideNavProps) => {
  const t = useT();
  const groups = useNavGroups();

  return (
    <nav
      aria-label={t("nav.label")}
      data-testid="side-nav"
      className={cn(
        "flex h-full shrink-0 flex-col gap-6 overflow-y-auto border-r border-hairline bg-card",
        "pt-[calc(var(--space-6)+var(--app-inset-top))] pb-[calc(var(--space-6)+var(--app-inset-bottom))]",
        expanded ? "w-58 px-3" : "w-21 items-center px-2",
      )}
    >
      <span
        className={cn(
          "font-wordmark leading-none font-black text-strong",
          expanded ? "px-3 text-display-2" : "text-title",
        )}
        aria-hidden
      >
        {expanded ? t("app.title") : t("app.title").charAt(0)}
      </span>

      {groups.map((group) => (
        <div
          key={group.key}
          role="group"
          aria-label={group.label}
          className={cn("flex flex-col gap-1", !expanded && "items-center")}
        >
          {expanded && <span className="u-eyebrow px-3 pb-1">{group.label}</span>}
          {group.items
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = item.key === tab;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label={expanded ? undefined : item.label}
                  title={expanded ? undefined : item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onChange(item.key);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center rounded-pill border-0 font-text text-body font-bold",
                    "transition-[background-color,color,scale] duration-(--dur-fast) ease-standard",
                    "active:scale-(--press-scale) active:duration-(--dur-instant)",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                    expanded ? "h-11 w-full gap-3 px-3 text-left" : "size-13 justify-center",
                    active
                      ? "bg-inverse text-on-inverse"
                      : "bg-transparent text-muted hover:bg-sunken hover:text-strong",
                  )}
                >
                  <Icon name={item.icon} size={22} className="shrink-0" />
                  {expanded && <span className="min-w-0 truncate">{item.label}</span>}
                </button>
              );
            })}
        </div>
      ))}
    </nav>
  );
};
