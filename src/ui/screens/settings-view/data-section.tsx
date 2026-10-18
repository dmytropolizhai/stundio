import { Icon, cn } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import { useSyncSummary } from "@/ui/hooks/useSyncSummary.ts";
import { useT } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";
import { SettingsRow, StatusDot } from "./settings-row.tsx";

const DOT = {
  synced: "success",
  syncing: "warning",
  offline: "offline",
  failed: "danger",
} as const;

export const DataSection = () => {
  const t = useT();
  const { state, label } = useSyncSummary();
  const analyticsEnabled = useAppStore((s) => s.settings.analyticsEnabled);
  const refresh = useAppStore((s) => s.refresh);
  const setAnalyticsEnabled = useSettingSetter("analyticsEnabled");
  const syncing = state === "syncing";

  return (
    <Section title={t("settings.data")}>
      {/* Acts instead of opening: a tap refreshes, so the trailing glyph is the refresh arrow. */}
      <SettingsRow
        icon="cloud"
        label={t("settings.sync")}
        description={t("settings.syncHint")}
        value={
          <>
            <StatusDot tone={DOT[state]} />
            <span className="truncate">{label}</span>
          </>
        }
        trailing={
          <Icon
            name="refresh-cw"
            size={18}
            className={cn(syncing && "animate-spin motion-reduce:animate-none")}
          />
        }
        disabled={syncing}
        onClick={() => {
          void refresh({ force: true });
        }}
      />
      <SettingsRow
        icon="chart-column"
        label={t("settings.analytics")}
        description={t("settings.analyticsHint")}
        checked={analyticsEnabled}
        onCheckedChange={(checked) => void setAnalyticsEnabled(checked)}
      />
    </Section>
  );
};
