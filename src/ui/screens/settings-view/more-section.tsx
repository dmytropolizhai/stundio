import { useId, useState } from "react";
import { Icon, cn } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { SettingsRow } from "./settings-row.tsx";
import { Section } from "./settings-section.tsx";
import { ShareLanguageRow } from "./share-section.tsx";

/**
 * The settings a student sets once a term, or never: how consecutive lessons are drawn, where a
 * moved lesson shows, the language of a shared card, anonymous analytics. Folded behind one row so
 * the screen answers the common questions first; it opens in place (no sheet) and stays open while
 * the screen does. Nothing in here is hidden for good — it is one tap away, with the same switches
 * as everywhere else.
 */
export const MoreSection = () => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const settings = useAppStore((s) => s.settings);
  const setMergeConsecutiveLessons = useSettingSetter("mergeConsecutiveLessons");
  const setShowMovedOnTargetDay = useSettingSetter("showMovedOnTargetDay");
  const setAnalyticsEnabled = useSettingSetter("analyticsEnabled");

  return (
    <Section>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-4 py-2.5 text-left font-text text-body font-medium text-strong transition-colors duration-(--dur-fast) ease-(--ease-standard) active:bg-sunken"
      >
        <Icon name="sliders-horizontal" size={20} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">{t("settings.advanced")}</span>
        <Icon
          name="chevron-down"
          size={16}
          className={cn(
            "shrink-0 text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard)",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div id={panelId}>
          <SettingsRow
            icon="layers"
            label={t("settings.mergeLessons")}
            description={t("settings.mergeLessonsHint")}
            checked={settings.mergeConsecutiveLessons}
            onCheckedChange={(checked) => void setMergeConsecutiveLessons(checked)}
          />
          <SettingsRow
            icon="arrow-left-right"
            label={t("settings.movedOnTarget")}
            description={t("settings.movedOnTargetHint")}
            checked={settings.showMovedOnTargetDay}
            onCheckedChange={(checked) => void setShowMovedOnTargetDay(checked)}
          />
          <ShareLanguageRow />
          <SettingsRow
            icon="chart-column"
            label={t("settings.analytics")}
            description={t("settings.analyticsHint")}
            checked={settings.analyticsEnabled}
            onCheckedChange={(checked) => void setAnalyticsEnabled(checked)}
          />
        </div>
      )}
    </Section>
  );
};
