import { Button, Switch } from "@/ds";
import { useAppStore } from "@/store";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

export const DataSection = () => {
  const t = useT();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const settings = useAppStore((s) => s.settings);
  const refresh = useAppStore((s) => s.refresh);
  const setAnalyticsEnabled = useAppStore((s) => s.setAnalyticsEnabled);

  return (
    <Section title={t("settings.data")}>
      <Row className="flex flex-wrap items-center justify-between gap-3">
        <SyncBadge collapsible={false} />
        <Button
          size="sm"
          disabled={syncStatus === "syncing"}
          icon="refresh-cw"
          onClick={() => {
            void refresh({ force: true });
          }}
        >
          {t("sync.refresh")}
        </Button>
      </Row>
      <Row className="flex items-start justify-between gap-3">
        <div>
          <p className="font-text text-body font-bold text-strong">{t("settings.analytics")}</p>
          <p className="mt-0.5 font-text text-caption text-muted">{t("settings.analyticsHint")}</p>
        </div>
        <Switch
          aria-label={t("settings.analytics")}
          checked={settings.analyticsEnabled}
          onChange={(checked) => {
            void setAnalyticsEnabled(checked);
          }}
        />
      </Row>
    </Section>
  );
};
