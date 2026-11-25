/**
 * The phone's single-surface floating bottom bar: primary schedule tabs (Home, Week, Changes with
 * a live count badge) plus either a direct personal tab (for teachers, whose only personal tab is
 * Settings) or a "More" slot that opens `MoreSheet`.
 *
 * Mounted inside the shell's fixed bottom stack alongside `DateDock` so both share one inset and
 * flex gap. Wide layouts use `SideNav` instead.
 */
import { useState } from "react";
import { BottomNav, type BottomNavItem } from "@/ds";
import { useT } from "@/ui/i18n";
import type { Tab } from "@/ui/persona";
import { useChangesCount } from "@/ui/hooks/useChangesCount.ts";
import { activeBarSlotKey, useBarSlots, type BarMoreSlot, type BarSlotKey } from "./nav-items.ts";
import { MoreSheet } from "./MoreSheet.tsx";

export type { Tab };

type TabBarProps = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  onPickIdentity?: () => void;
};

export const TabBar = ({ tab, onChange, onPickIdentity }: TabBarProps) => {
  const t = useT();
  const slots = useBarSlots();
  const changesCount = useChangesCount();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreSlot = slots.find((slot): slot is BarMoreSlot => slot.kind === "more");
  const activeKey = activeBarSlotKey(slots, tab);

  const items: BottomNavItem<BarSlotKey>[] = slots.map((slot) => {
    if (slot.kind === "more") {
      return {
        key: "more",
        icon: slot.icon,
        label: slot.label,
        hasPopup: "dialog",
        expanded: moreOpen,
      };
    }

    const badge = slot.key === "changes" && changesCount > 0 ? changesCount : undefined;
    return {
      key: slot.key,
      icon: slot.icon,
      label: slot.label,
      badge,
      ariaLabel:
        badge !== undefined
          ? t("nav.changesBadge", { label: slot.label, count: String(badge) })
          : undefined,
    };
  });

  return (
    <>
      <BottomNav
        items={items}
        value={activeKey}
        onChange={(key) => {
          if (key === "more") {
            setMoreOpen((open) => !open);
          } else {
            setMoreOpen(false);
            onChange(key);
          }
        }}
        label={t("nav.label")}
        className="pointer-events-auto w-full"
      />

      {moreSlot !== undefined && (
        <MoreSheet
          open={moreOpen}
          onClose={() => {
            setMoreOpen(false);
          }}
          items={moreSlot.items}
          activeTab={tab}
          onSelect={onChange}
          onPickIdentity={() => {
            onPickIdentity?.();
          }}
        />
      )}
    </>
  );
};
